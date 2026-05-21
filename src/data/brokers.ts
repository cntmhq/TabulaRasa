import { SchemaOrganization } from '../types';

export const brokers: SchemaOrganization[] = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    identifier: "b1",
    name: "Acme Data Solutions",
    email: "privacy@acmedata.example.com",
    url: "https://acmedata.example.com",
    contactPoint: {
      "@type": "ContactPoint",
      name: "Privacy Officer",
      email: "privacy@acmedata.example.com",
      contactType: "legal compliance"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    identifier: "b2",
    name: "Global Info Broker",
    email: "dpo@globalinfo.example.com",
    url: "https://globalinfo.example.com",
    contactPoint: {
      "@type": "ContactPoint",
      name: "Data Protection Officer",
      email: "dpo@globalinfo.example.com",
      contactType: "customer service"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    identifier: "b3",
    name: "Marketing Reach Inc.",
    email: "gdpr-requests@marketingreach.example.com",
    url: "https://marketingreach.example.com",
    contactPoint: {
      "@type": "ContactPoint",
      name: "GDPR Compliance Team",
      email: "gdpr-requests@marketingreach.example.com",
      contactType: "legal compliance"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    identifier: "b4",
    name: "EuroData Analytics",
    email: "erasure@eurodata.example.eu",
    url: "https://eurodata.example.eu",
    contactPoint: {
      "@type": "ContactPoint",
      name: "Data Privacy Operations",
      email: "erasure@eurodata.example.eu",
      contactType: "data controller"
    }
  }
];
