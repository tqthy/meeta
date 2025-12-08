-- DropForeignKey
ALTER TABLE "Meeting" DROP CONSTRAINT "Meeting_hostId_fkey";

-- AlterTable
ALTER TABLE "Meeting" ALTER COLUMN "hostId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
