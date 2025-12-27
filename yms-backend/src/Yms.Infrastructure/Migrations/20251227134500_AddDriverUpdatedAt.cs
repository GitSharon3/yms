using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

using Yms.Infrastructure.Data;

#nullable disable

namespace Yms.Infrastructure.Migrations;

[DbContext(typeof(YmsDbContext))]
[Migration("20251227134500_AddDriverUpdatedAt")]
public partial class AddDriverUpdatedAt : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Drivers' AND column_name = 'UpdatedAt'
    ) THEN
        ALTER TABLE ""Drivers"" ADD COLUMN ""UpdatedAt"" timestamp with time zone NULL;
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
        WHERE table_name = 'Drivers' AND column_name = 'UpdatedAt'
    ) THEN
        ALTER TABLE ""Drivers"" DROP COLUMN ""UpdatedAt"";
    END IF;
END $$;
");
    }
}
