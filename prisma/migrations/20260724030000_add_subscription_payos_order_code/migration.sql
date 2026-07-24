-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "payosOrderCode" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_payosOrderCode_key" ON "Subscription"("payosOrderCode");

