export type CertificationKind =
  | 'certification'
  | 'regulatory'
  | 'individual_qualification';

export interface CertificationCatalogueItem {
  id: string;
  label: string;
  kind: CertificationKind;
  notes?: string;
}

export interface CertificationCatalogueCategory {
  id: string;
  title: string;
  description?: string;
  items: CertificationCatalogueItem[];
}

function item(
  id: string,
  label: string,
  kind: CertificationKind = 'certification',
  notes?: string,
): CertificationCatalogueItem {
  return { id, label, kind, ...(notes ? { notes } : {}) };
}

/**
 * Canonical supplier certification / compliance catalogue.
 * IDs must stay aligned with the frontend catalogue used for create/upload UX.
 * `kind` distinguishes voluntary certifications, regulatory programmes, and
 * individual qualifications (e.g. PCQI).
 */
export const SUPPLIER_CERTIFICATION_CATALOGUE: CertificationCatalogueCategory[] =
  [
    {
      id: 'intl-mgmt-food-safety',
      title: 'International management systems and food safety',
      items: [
        item('iso-9001', 'ISO 9001 – Quality Management'),
        item('iso-14001', 'ISO 14001 – Environmental Management'),
        item('iso-45001', 'ISO 45001 – Occupational Health and Safety'),
        item('iso-22000', 'ISO 22000 – Food Safety Management'),
        item('iso-50001', 'ISO 50001 – Energy Management'),
        item('iso-22301', 'ISO 22301 – Business Continuity'),
        item('iso-iec-27001', 'ISO/IEC 27001 – Information Security'),
        item('fssc-22000', 'FSSC 22000 – Food Safety Certification'),
        item('haccp', 'HACCP – Hazard Analysis and Critical Control Points'),
        item('gmp', 'GMP – Good Manufacturing Practice'),
        item('ghp', 'GHP – Good Hygiene Practice'),
        item(
          'codex-alimentarius',
          'Codex Alimentarius – International food safety and agricultural standards',
        ),
      ],
    },
    {
      id: 'european-schemes',
      title: 'European food, retail and packaging schemes',
      items: [
        item('brcgs-food', 'BRCGS Food Safety'),
        item('brcgs-packaging', 'BRCGS Packaging Materials'),
        item('brcgs-consumer', 'BRCGS Consumer Products'),
        item('brcgs-storage', 'BRCGS Storage and Distribution'),
        item('brcgs-agents', 'BRCGS Agents and Brokers'),
        item('ifs-food', 'IFS Food'),
        item('ifs-logistics', 'IFS Logistics'),
        item('ifs-broker', 'IFS Broker'),
        item('ifs-pacsecure', 'IFS PACsecure'),
        item('en-15593', 'EN 15593 – Hygiene Management for Food Packaging'),
        item(
          'fami-qs',
          'FAMI-QS – Feed Additives and Premixtures Quality System',
        ),
        item('gmp-plus', 'GMP+ – Feed Safety Assurance'),
        item('eu-organic', 'EU Organic Certification'),
        item('eu-gi', 'EU Geographical Indications – PDO, PGI and TSG'),
        item('emas', 'EMAS – EU Eco-Management and Audit Scheme'),
        item('eu-ecolabel', 'EU Ecolabel'),
        item(
          'en-iso-13485',
          'EN ISO 13485 – Medical Device Quality Management',
        ),
      ],
    },
    {
      id: 'us-food-ag',
      title: 'US food safety and agricultural requirements',
      description:
        'FSMA, FDA requirements and FSVP are regulatory compliance programmes, not standalone company certifications. PCQI is an individual qualification.',
      items: [
        item('sqf', 'SQF – Safe Quality Food'),
        item(
          'usda-organic-nop',
          'USDA Organic – National Organic Program (NOP) – Agricultural Marketing Service',
        ),
        item(
          'usda-gap-ghp',
          'USDA GAP & GHP – Good Agricultural Practices and Good Handling Practices',
        ),
        item(
          'primusgfs',
          'PrimusGFS – Produce and agricultural supply-chain safety',
        ),
        item(
          'harmonized-gap',
          'Harmonized GAP – USDA agricultural assurance programme',
        ),
        item(
          'fsma',
          'FSMA – Food Safety Modernization Act compliance',
          'regulatory',
          'Regulatory requirement / compliance programme',
        ),
        item(
          'fda-pc-human-food',
          'FDA Preventive Controls for Human Food',
          'regulatory',
        ),
        item(
          'fsvp',
          'FSVP – Foreign Supplier Verification Program',
          'regulatory',
          'FDA regulatory programme',
        ),
        item(
          'fda-accredited-tpc',
          'FDA Accredited Third-Party Certification',
          'regulatory',
        ),
        item('usda-pvp', 'USDA Process Verified Program (PVP)'),
        item(
          'usda-animal-welfare',
          'USDA Animal Welfare and livestock verification programmes, where applicable',
        ),
        item(
          'usda-nop-farms',
          'USDA National Organic Program certification for farms and processors',
        ),
        item(
          'pcqi',
          'PCQI – Preventive Controls Qualified Individual',
          'individual_qualification',
          'Individual qualification, not a company certificate',
        ),
      ],
    },
    {
      id: 'agriculture-primary',
      title: 'Agriculture, farming and primary production',
      items: [
        item('globalgap', 'GLOBALG.A.P. – Good Agricultural Practices'),
        item('globalgap-ifa', 'GLOBALG.A.P. Integrated Farm Assurance (IFA)'),
        item(
          'globalgap-pha',
          'GLOBALG.A.P. Produce Handling Assurance (PHA)',
        ),
        item('globalgap-coc', 'GLOBALG.A.P. Chain of Custody'),
        item('leaf-marque', 'LEAF Marque – Sustainable farming'),
        item('red-tractor', 'Red Tractor Assurance – UK agriculture'),
        item('soil-association-organic', 'Soil Association Organic'),
        item('roc', 'Regenerative Organic Certified (ROC)'),
        item('certified-naturally-grown', 'Certified Naturally Grown'),
        item('rainforest-alliance', 'Rainforest Alliance Certification'),
        item('fairtrade', 'Fairtrade Certification'),
        item('bonsucro', 'Bonsucro – Sustainable sugarcane'),
        item('4c', '4C Certification – Sustainable coffee'),
        item('rspo', 'Roundtable on Sustainable Palm Oil (RSPO)'),
        item('rtrs', 'Round Table on Responsible Soy (RTRS)'),
        item(
          'iscc',
          'International Sustainability and Carbon Certification (ISCC)',
        ),
        item('proterra', 'ProTerra Foundation Certification'),
        item('better-cotton', 'Better Cotton'),
        item(
          'sai-fsa',
          'Sustainable Agriculture Initiative Platform (SAI Platform) – Farm Sustainability Assessment',
        ),
      ],
    },
    {
      id: 'feed-livestock-aqua',
      title: 'Animal feed, livestock and aquaculture',
      items: [
        item('gmp-plus-feed', 'GMP+ Feed Safety Assurance'),
        item('fami-qs-feed', 'FAMI-QS – Feed additives and premixtures'),
        item('qs-food', 'QS – Quality Scheme for Food'),
        item('globalgap-aquaculture', 'GLOBALG.A.P. Aquaculture'),
        item('bap', 'Best Aquaculture Practices (BAP)'),
        item('asc', 'Aquaculture Stewardship Council (ASC)'),
        item('msc', 'Marine Stewardship Council (MSC)'),
        item('friend-of-the-sea', 'Friend of the Sea'),
        item('rws', 'Responsible Wool Standard (RWS)'),
        item('gap-animal', 'Global Animal Partnership (G.A.P.)'),
      ],
    },
    {
      id: 'env-climate',
      title: 'Environmental, climate and sustainability certifications',
      items: [
        item(
          'iso-14064',
          'ISO 14064 – Greenhouse Gas Quantification and Reporting',
        ),
        item('iso-14067', 'ISO 14067 – Product Carbon Footprint'),
        item('iso-14046', 'ISO 14046 – Water Footprint'),
        item('iso-14025', 'ISO 14025 – Environmental Product Declarations'),
        item(
          'pas-2060',
          'PAS 2060 – Historical carbon-neutrality specification; check current replacement and applicable requirements',
        ),
        item('iso-14068-1', 'ISO 14068-1 – Carbon Neutrality'),
        item('iscc-plus', 'ISCC PLUS – Circularity and sustainability'),
      ],
    },
  ];

export function getFlatCertificationCatalogue(): CertificationCatalogueItem[] {
  return SUPPLIER_CERTIFICATION_CATALOGUE.flatMap((category) => category.items);
}

export function findCatalogueItemById(
  catalogueId: string,
): CertificationCatalogueItem | undefined {
  return getFlatCertificationCatalogue().find(
    (entry) => entry.id === catalogueId,
  );
}
