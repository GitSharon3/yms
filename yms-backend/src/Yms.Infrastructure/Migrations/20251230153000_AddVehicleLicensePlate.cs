using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

using Yms.Infrastructure.Data;

#nullable disable

namespace Yms.Infrastructure.Migrations;

[DbContext(typeof(YmsDbContext))]
[Migration("20251230153000_AddVehicleLicensePlate")]
public partial class AddVehicleLicensePlate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Vehicles' AND column_name = 'LicensePlate'
    ) THEN
        ALTER TABLE ""Vehicles"" ADD COLUMN ""LicensePlate"" character varying(30) NULL;
    END IF;
END $$;
");

        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = current_schema() AND indexname = 'IX_Vehicles_LicensePlate'
    ) THEN
        CREATE INDEX ""IX_Vehicles_LicensePlate"" ON ""Vehicles"" (""LicensePlate"");
    END IF;
END $$;
");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Vehicles' AND column_name = 'LicensePlate'
    ) THEN
        ALTER TABLE ""Vehicles"" DROP COLUMN ""LicensePlate"";
    END IF;
END $$;
");
    }
}
