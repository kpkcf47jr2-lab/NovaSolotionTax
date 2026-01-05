// IMPORTANTE: Este es el archivo NUEVO que debes CREAR
// Ubicación en NovaSolutionTax: packages/workers/src/parsers.ts
// Instrucción: Crea este archivo nuevo con TODO este contenido

export interface ParsedField {
  value: any;
  confidence: number;
  sourceMapping?: {
    pageNumber?: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
    rawText?: string;
  };
}

export interface ParsedDocument {
  fields: Record<string, ParsedField>;
  overallConfidence: number;
  extractorType: 'MOCK_OCR' | 'REAL_OCR' | 'PDF_PARSER' | 'ML_MODEL';
  extractedAt: Date;
  evidence: string;
}

export function parseW2(_fileName: string, _fileContent: Buffer): ParsedDocument {
  return {
    fields: {
      'income.wages': {
        value: 75000,
        confidence: 0.95,
        sourceMapping: { rawText: 'Box 1: 75,000.00', pageNumber: 1 },
      },
      'income.socialSecurityWages': {
        value: 75000,
        confidence: 0.95,
        sourceMapping: { rawText: 'Box 3: 75,000.00' },
      },
      'income.medicareWages': {
        value: 75000,
        confidence: 0.95,
        sourceMapping: { rawText: 'Box 5: 75,000.00' },
      },
      'withheld.federalTaxWithheld': {
        value: 12500,
        confidence: 0.98,
        sourceMapping: { rawText: 'Box 2: 12,500.00' },
      },
      'withheld.socialSecurityTaxWithheld': {
        value: 4650,
        confidence: 0.98,
        sourceMapping: { rawText: 'Box 4: 4,650.00' },
      },
      'withheld.medicareTaxWithheld': {
        value: 1087.5,
        confidence: 0.98,
        sourceMapping: { rawText: 'Box 6: 1,087.50' },
      },
      'employer.name': {
        value: 'TechCorp Inc',
        confidence: 0.92,
        sourceMapping: { rawText: 'Box c: TechCorp Inc' },
      },
      'employer.ein': {
        value: '12-3456789',
        confidence: 0.99,
        sourceMapping: { rawText: 'Box b: 12-3456789' },
      },
    },
    overallConfidence: 0.96,
    extractorType: 'MOCK_OCR',
    extractedAt: new Date(),
    evidence: 'W-2 form extracted: $75,000 wages, $12,500 federal withholding',
  };
}

export function parse1099Int(_fileName: string, _fileContent: Buffer): ParsedDocument {
  return {
    fields: {
      'income.interestIncome': {
        value: 1250,
        confidence: 0.98,
        sourceMapping: { rawText: 'Box 1: 1,250.00' },
      },
      'withheld.federalTaxWithheld': {
        value: 0,
        confidence: 1.0,
        sourceMapping: { rawText: 'Box 4: 0.00' },
      },
      'institution.name': {
        value: 'First National Bank',
        confidence: 0.95,
        sourceMapping: { rawText: 'Box c: First National Bank' },
      },
    },
    overallConfidence: 0.98,
    extractorType: 'MOCK_OCR',
    extractedAt: new Date(),
    evidence: '1099-INT form extracted: $1,250 interest income',
  };
}

export function parse1099Div(_fileName: string, _fileContent: Buffer): ParsedDocument {
  return {
    fields: {
      'income.qualifiedDividends': {
        value: 2500,
        confidence: 0.97,
        sourceMapping: { rawText: 'Box 1b: 2,500.00' },
      },
      'income.ordinaryDividends': {
        value: 500,
        confidence: 0.97,
        sourceMapping: { rawText: 'Box 1a: 500.00' },
      },
      'withheld.federalTaxWithheld': {
        value: 75,
        confidence: 0.99,
        sourceMapping: { rawText: 'Box 4: 75.00' },
      },
      'institution.name': {
        value: 'Vanguard Investments',
        confidence: 0.93,
        sourceMapping: { rawText: 'Box c: Vanguard Investments' },
      },
    },
    overallConfidence: 0.96,
    extractorType: 'MOCK_OCR',
    extractedAt: new Date(),
    evidence: '1099-DIV form extracted: $2,500 qualified dividends, $500 ordinary',
  };
}

export function parse1099Nec(_fileName: string, _fileContent: Buffer): ParsedDocument {
  return {
    fields: {
      'income.businessIncome': {
        value: 35000,
        confidence: 0.96,
        sourceMapping: { rawText: 'Box 1: 35,000.00' },
      },
      'withheld.federalTaxWithheld': {
        value: 3500,
        confidence: 0.98,
        sourceMapping: { rawText: 'Box 4: 3,500.00' },
      },
      'payer.name': {
        value: 'Consulting Client LLC',
        confidence: 0.91,
        sourceMapping: { rawText: 'Box c: Consulting Client LLC' },
      },
    },
    overallConfidence: 0.95,
    extractorType: 'MOCK_OCR',
    extractedAt: new Date(),
    evidence: '1099-NEC form extracted: $35,000 nonemployee compensation',
  };
}

export function parse1099Misc(_fileName: string, _fileContent: Buffer): ParsedDocument {
  return {
    fields: {
      'income.rentals': {
        value: 12000,
        confidence: 0.94,
        sourceMapping: { rawText: 'Box 1: 12,000.00' },
      },
      'payer.name': {
        value: 'Property Management Co',
        confidence: 0.90,
        sourceMapping: { rawText: 'Box c: Property Management Co' },
      },
    },
    overallConfidence: 0.92,
    extractorType: 'MOCK_OCR',
    extractedAt: new Date(),
    evidence: '1099-MISC form extracted: $12,000 miscellaneous income',
  };
}

export function parse1098T(_fileName: string, _fileContent: Buffer): ParsedDocument {
  return {
    fields: {
      'credits.educationCredits': {
        value: 5000,
        confidence: 0.97,
        sourceMapping: { rawText: 'Box 1: 5,000.00' },
      },
      'institution.name': {
        value: 'State University',
        confidence: 0.94,
        sourceMapping: { rawText: 'Box e: State University' },
      },
    },
    overallConfidence: 0.96,
    extractorType: 'MOCK_OCR',
    extractedAt: new Date(),
    evidence: '1098-T form extracted: $5,000 qualified education expenses',
  };
}

export function parseMortgageStatement(_fileName: string, _fileContent: Buffer): ParsedDocument {
  return {
    fields: {
      'deductions.mortgageInterest': {
        value: 18000,
        confidence: 0.95,
        sourceMapping: { rawText: 'Year-to-date interest: $18,000' },
      },
      'deductions.propertyTaxes': {
        value: 6000,
        confidence: 0.93,
        sourceMapping: { rawText: 'Property taxes paid: $6,000' },
      },
      'lender.name': {
        value: 'Chase Mortgage',
        confidence: 0.98,
        sourceMapping: { rawText: 'Chase Mortgage' },
      },
    },
    overallConfidence: 0.95,
    extractorType: 'MOCK_OCR',
    extractedAt: new Date(),
    evidence: 'Mortgage statement extracted: $18,000 interest, $6,000 property taxes',
  };
}

export function parseBrokerStatement(_fileName: string, _fileContent: Buffer): ParsedDocument {
  return {
    fields: {
      'income.capitalGains': {
        value: 15000,
        confidence: 0.92,
        sourceMapping: { rawText: 'Long-term capital gains: $15,000' },
      },
      'income.capitalLosses': {
        value: -2000,
        confidence: 0.91,
        sourceMapping: { rawText: 'Realized losses: ($2,000)' },
      },
      'withheld.federalTaxWithheld': {
        value: 1500,
        confidence: 0.94,
        sourceMapping: { rawText: 'Federal tax withheld: $1,500' },
      },
      'broker.name': {
        value: 'E*TRADE Financial',
        confidence: 0.99,
        sourceMapping: { rawText: 'E*TRADE Financial' },
      },
    },
    overallConfidence: 0.94,
    extractorType: 'MOCK_OCR',
    extractedAt: new Date(),
    evidence: 'Broker statement extracted: $15,000 long-term gains, $2,000 losses',
  };
}

export function parseDonationReceipt(_fileName: string, _fileContent: Buffer): ParsedDocument {
  return {
    fields: {
      'deductions.charitableContributions': {
        value: 5000,
        confidence: 0.90,
        sourceMapping: { rawText: 'Donation amount: $5,000' },
      },
      'charity.name': {
        value: 'Red Cross',
        confidence: 0.95,
        sourceMapping: { rawText: 'Recipient: Red Cross' },
      },
      'charity.ein': {
        value: '53-0196605',
        confidence: 0.98,
        sourceMapping: { rawText: 'EIN: 53-0196605' },
      },
    },
    overallConfidence: 0.94,
    extractorType: 'MOCK_OCR',
    extractedAt: new Date(),
    evidence: 'Donation receipt extracted: $5,000 charitable contribution',
  };
}

export function parseMedicalReceipt(_fileName: string, _fileContent: Buffer): ParsedDocument {
  return {
    fields: {
      'deductions.medicalExpenses': {
        value: 8000,
        confidence: 0.88,
        sourceMapping: { rawText: 'Total charges: $8,000' },
      },
      'provider.name': {
        value: 'City Medical Center',
        confidence: 0.92,
        sourceMapping: { rawText: 'Provider: City Medical Center' },
      },
    },
    overallConfidence: 0.90,
    extractorType: 'MOCK_OCR',
    extractedAt: new Date(),
    evidence: 'Medical invoice extracted: $8,000 medical expenses',
  };
}

export function parseBusinessReceipt(_fileName: string, _fileContent: Buffer): ParsedDocument {
  return {
    fields: {
      'deductions.businessSupplies': {
        value: 450,
        confidence: 0.85,
        sourceMapping: { rawText: 'Total: $450.00' },
      },
      'merchant.name': {
        value: 'Staples Office Supplies',
        confidence: 0.93,
        sourceMapping: { rawText: 'Staples' },
      },
      'date': {
        value: '2024-03-15',
        confidence: 0.98,
        sourceMapping: { rawText: '03/15/2024' },
      },
    },
    overallConfidence: 0.92,
    extractorType: 'MOCK_OCR',
    extractedAt: new Date(),
    evidence: 'Business receipt extracted: $450 office supplies',
  };
}

export function getParserForDocumentType(documentType: string) {
  const parserMap: Record<string, (name: string, content: Buffer) => ParsedDocument> = {
    W2_2024: parseW2,
    '1099_INT': parse1099Int,
    '1099_DIV': parse1099Div,
    '1099_NEC': parse1099Nec,
    '1099_MISC': parse1099Misc,
    '1098_T': parse1098T,
    MORTGAGE_STMT: parseMortgageStatement,
    BROKERAGE_STMT: parseBrokerStatement,
    DONATION_RECEIPT: parseDonationReceipt,
    MEDICAL_RECEIPT: parseMedicalReceipt,
    BUSINESS_RECEIPT: parseBusinessReceipt,
  };

  return parserMap[documentType] || null;
}
