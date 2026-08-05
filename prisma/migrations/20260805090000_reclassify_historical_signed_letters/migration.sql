UPDATE "FileAsset" AS file
SET
  "categoryKey" = CASE
    WHEN LOWER(document."type") LIKE '%transfer%' THEN 'signed-transfer-letter'
    ELSE 'signed-allotment-letter'
  END,
  "documentType" = CASE
    WHEN LOWER(document."type") LIKE '%transfer%'
      THEN 'TRANSFER_LETTER'::"RealEstateDocumentType"
    ELSE 'ALLOTMENT_LETTER'::"RealEstateDocumentType"
  END,
  "documentNo" = COALESCE(file."documentNo", document."number"),
  "documentDate" = COALESCE(
    file."documentDate",
    document."signedAt",
    document."finalizedAt",
    document."createdAt"
  )
FROM "GeneratedDocument" AS document
WHERE file."categoryKey" = 'old-documents'
  AND (document."data" ->> 'historicalImport') = 'true'
  AND (file."id" = document."fileAssetId" OR file."id" = document."signedFileAssetId")
  AND (
    LOWER(document."type") LIKE '%allotment%'
    OR LOWER(document."type") LIKE '%transfer%'
  );
