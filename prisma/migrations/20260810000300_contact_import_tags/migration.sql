CREATE TABLE "contact_imports" (
  "id" TEXT NOT NULL,
  "contact_id" TEXT NOT NULL,
  "import_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contact_imports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contact_imports_contact_id_import_id_key" ON "contact_imports"("contact_id", "import_id");
CREATE INDEX "contact_imports_import_id_idx" ON "contact_imports"("import_id");
CREATE INDEX "contact_imports_contact_id_idx" ON "contact_imports"("contact_id");
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "contact_imports" ("id", "contact_id", "import_id", "created_at")
SELECT 'ci_' || md5(c."id" || r."import_id"), c."id", r."import_id", CURRENT_TIMESTAMP
FROM "import_rows" r
JOIN "contacts" c ON c."phone" = r."normalized_data"->>'phone'
WHERE r."imported" = true
ON CONFLICT ("contact_id", "import_id") DO NOTHING;
