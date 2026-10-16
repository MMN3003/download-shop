-- AlterTable
ALTER TABLE "AttributeDefinition" ADD COLUMN     "linksSections" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "optionListId" TEXT;

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "childrenListId" TEXT,
ADD COLUMN     "optionItemId" TEXT;

-- CreateTable
CREATE TABLE "OptionList" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" JSONB NOT NULL,
    "icon" TEXT,
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OptionList_key_key" ON "OptionList"("key");

-- CreateIndex
CREATE UNIQUE INDEX "OptionItem_listId_value_key" ON "OptionItem"("listId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Section_optionItemId_key" ON "Section"("optionItemId");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_childrenListId_fkey" FOREIGN KEY ("childrenListId") REFERENCES "OptionList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_optionItemId_fkey" FOREIGN KEY ("optionItemId") REFERENCES "OptionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeDefinition" ADD CONSTRAINT "AttributeDefinition_optionListId_fkey" FOREIGN KEY ("optionListId") REFERENCES "OptionList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionItem" ADD CONSTRAINT "OptionItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "OptionList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

