import { SchemaOrganization } from '../types';

export const brokers: SchemaOrganization[] = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    identifier: "b1",
    name: "Acme Data Solutions",
    email: "privacy@acmedata.example.com",
    url: "https://acmedata.example.com",
    address: ["123 Data Avenue", "Suite 400, Tech District, NY 10001"],
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
    address: ["45 Brokerage Blvd", "Tower B, Corporate Park, CA 94107"],
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
    address: ["789 Growth Place", "Business Center, TX 75001"],
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
    address: ["10 Analytic Strasse", "10115 Berlin, Germany"],
    contactPoint: {
      "@type": "ContactPoint",
      name: "Data Privacy Operations",
      email: "erasure@eurodata.example.eu",
      contactType: "data controller"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    identifier: "b5",
    name: "OptOut Network Poland",
    email: "iodo@optoutnetwork.pl",
    url: "https://optoutnetwork.pl",
    address: ["Marszałkowska 123", "00-001 Warszawa, Poland"],
    contactPoint: {
      "@type": "ContactPoint",
      name: "Inspektor Ochrony Danych",
      email: "iodo@optoutnetwork.pl",
      contactType: "legal compliance"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    identifier: "b6",
    name: "Consumer Insights HQ",
    email: "privacy@consumerinsights.example.com",
    url: "https://consumerinsights.example.com",
    address: ["55 Insight Drive", "Innovation Valley, MA 02142"],
    contactPoint: {
      "@type": "ContactPoint",
      name: "Privacy Officer",
      email: "privacy@consumerinsights.example.com",
      contactType: "data controller"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    identifier: "b7",
    name: "TechAnalytics Group",
    email: "gdpr-removal@techanalytics.example.net",
    url: "https://techanalytics.example.net",
    address: ["200 Logic Way", "Building 4, WA 98109"],
    contactPoint: {
      "@type": "ContactPoint",
      name: "Compliance Team",
      email: "gdpr-removal@techanalytics.example.net",
      contactType: "legal compliance"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    identifier: "b8",
    name: "Predictive Behavior Ltd",
    email: "dpo@predictive.example.co.uk",
    url: "https://predictive.example.co.uk",
    address: ["14 Prediction Court", "London EC1V 2NX, UK"],
    contactPoint: {
      "@type": "ContactPoint",
      name: "Data Protection Officer",
      email: "dpo@predictive.example.co.uk",
      contactType: "customer service"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    identifier: "b9",
    name: "AdTargeting Plus",
    email: "opt-out@adtargetingplus.example.com",
    url: "https://adtargetingplus.example.com",
    address: ["808 Ad Circle", "Suite 100, IL 60601"],
    contactPoint: {
      "@type": "ContactPoint",
      name: "Privacy Compliance",
      email: "opt-out@adtargetingplus.example.com",
      contactType: "legal compliance"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    identifier: "b10",
    name: "MegaData Brokers",
    email: "erasure-requests@megadata.example.com",
    url: "https://megadata.example.com",
    address: ["900 Storage Road", "Data Valley, NV 89014"],
    contactPoint: {
      "@type": "ContactPoint",
      name: "GDPR Desk",
      email: "erasure-requests@megadata.example.com",
      contactType: "data controller"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    identifier: "b11",
    name: "Profile Harvesters LLC",
    email: "privacy@profileharvesters.example.com",
    url: "https://profileharvesters.example.com",
    address: ["33 Profile Lane", "Suite 22, FL 33101"],
    contactPoint: {
      "@type": "ContactPoint",
      name: "Compliance Officer",
      email: "privacy@profileharvesters.example.com",
      contactType: "customer service"
    }
  }
];
