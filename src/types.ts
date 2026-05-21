export interface ContactPoint {
  "@type": "ContactPoint";
  name: string;
  email: string;
  contactType: string;
}

export interface SchemaOrganization {
  "@context": "https://schema.org";
  "@type": "Organization";
  identifier: string;
  name: string;
  email: string;
  url: string;
  contactPoint: ContactPoint;
}

export interface SchemaPerson {
  "@context": "https://schema.org";
  "@type": "Person";
  identifier: string;
  givenName: string;
  familyName: string;
  email: string;
  image?: string;
  authProvider: "google" | "guest";
  authState: {
    isAuthenticated: boolean;
    tokenExpiry?: number;
  };
  preferences: {
    autoFillSignature: boolean;
    manualSignature?: string;
  };
}
