package mail

import (
	"bytes"
	"encoding/base64"
	"errors"
	"fmt"
	"mime"
	"mime/multipart"
	"net/mail"
	"net/textproto"
	"strings"
	"time"

	gmailapi "google.golang.org/api/gmail/v1"
)

type Outbound struct {
	Sender           string
	Recipient        string
	Subject          string
	BodyPlain        string
	BodyHTML         string
	IdempotencyToken string
}

func (o *Outbound) Validate() error {
	if _, err := mail.ParseAddress(o.Sender); err != nil {
		return fmt.Errorf("invalid sender_identity: %w", err)
	}
	if _, err := mail.ParseAddress(o.Recipient); err != nil {
		return fmt.Errorf("invalid recipient_address: %w", err)
	}
	if strings.TrimSpace(o.Subject) == "" {
		return errors.New("subject_line is required")
	}
	if strings.TrimSpace(o.BodyPlain) == "" && strings.TrimSpace(o.BodyHTML) == "" {
		return errors.New("body_content_plain or body_content_html is required")
	}
	return nil
}

// BuildRFC822 assembles a multipart/alternative MIME message that Gmail will
// accept under the gmail.send scope. The result is base64url-encoded for the
// users.messages.send "raw" field.
func BuildRFC822(o *Outbound) (string, error) {
	if err := o.Validate(); err != nil {
		return "", err
	}

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	boundary := writer.Boundary()

	headers := textproto.MIMEHeader{}
	headers.Set("From", o.Sender)
	headers.Set("To", o.Recipient)
	headers.Set("Subject", mime.QEncoding.Encode("utf-8", o.Subject))
	headers.Set("Date", time.Now().UTC().Format(time.RFC1123Z))
	headers.Set("MIME-Version", "1.0")
	headers.Set("Content-Type", fmt.Sprintf(`multipart/alternative; boundary="%s"`, boundary))

	var out bytes.Buffer
	for k, vs := range headers {
		for _, v := range vs {
			fmt.Fprintf(&out, "%s: %s\r\n", k, v)
		}
	}
	out.WriteString("\r\n")

	if plain := strings.TrimSpace(o.BodyPlain); plain != "" {
		part, err := writer.CreatePart(textproto.MIMEHeader{
			"Content-Type":              []string{"text/plain; charset=UTF-8"},
			"Content-Transfer-Encoding": []string{"quoted-printable"},
		})
		if err != nil {
			return "", err
		}
		if _, err := part.Write([]byte(plain)); err != nil {
			return "", err
		}
	}
	if html := strings.TrimSpace(o.BodyHTML); html != "" {
		part, err := writer.CreatePart(textproto.MIMEHeader{
			"Content-Type":              []string{"text/html; charset=UTF-8"},
			"Content-Transfer-Encoding": []string{"quoted-printable"},
		})
		if err != nil {
			return "", err
		}
		if _, err := part.Write([]byte(html)); err != nil {
			return "", err
		}
	}
	if err := writer.Close(); err != nil {
		return "", err
	}
	out.Write(buf.Bytes())

	return base64.URLEncoding.EncodeToString(out.Bytes()), nil
}

// Send hands the assembled raw RFC822 blob to gmail.users.messages.send.
func Send(svc *gmailapi.Service, sender string, raw string) (*gmailapi.Message, error) {
	msg := &gmailapi.Message{Raw: raw}
	return svc.Users.Messages.Send("me", msg).Do()
}
