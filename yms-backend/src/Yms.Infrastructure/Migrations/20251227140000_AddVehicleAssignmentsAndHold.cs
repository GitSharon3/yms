using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

using Yms.Infrastructure.Data;

#nullable disable

namespace Yms.Infrastructure.Migrations;

[DbContext(typeof(YmsDbContext))]
[Migration("20251227140000_AddVehicleAssignmentsAndHold")]
public partial class AddVehicleAssignmentsAndHold : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Vehicles' AND column_name = 'IsOnHold'
    ) THEN
        ALTER TABLE ""Vehicles"" ADD COLUMN ""IsOnHold"" boolean NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Vehicles' AND column_name = 'HoldReason'
    ) THEN
        ALTER TABLE ""Vehicles"" ADD COLUMN ""HoldReason"" character varying(250) NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Vehicles' AND column_name = 'UpdatedAt'
    ) THEN
        ALTER TABLE ""Vehicles"" ADD COLUMN ""UpdatedAt"" timestamp with time zone NULL;
    END IF;
END $$;
");

        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'VehicleAssignments'
    ) THEN
        CREATE TABLE ""VehicleAssignments"" (
            ""Id"" uuid NOT NULL,
            ""VehicleId"" uuid NOT NULL,
            ""UserId"" uuid NOT NULL,
            ""AssignmentRole"" character varying(30) NOT NULL,
            ""IsActive"" boolean NOT NULL DEFAULT TRUE,
            ""AssignedAtUtc"" timestamp with time zone NOT NULL,
            ""UnassignedAtUtc"" timestamp with time zone NULL,
            ""CreatedAtUtc"" timestamp with time zone NOT NULL,
            ""UpdatedAt"" timestamp with time zone NULL,
            CONSTRAINT ""PK_VehicleAssignments"" PRIMARY KEY (""Id""),
            CONSTRAINT ""FK_VehicleAssignments_Vehicles_VehicleId"" FOREIGN KEY (""VehicleId"") REFERENCES ""Vehicles""(""Id"") ON DELETE CASCADE,
            CONSTRAINT ""FK_VehicleAssignments_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users""(""Id"") ON DELETE CASCADE
        );
    END IF;
END $$;
");

        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = current_schema() AND indexname = 'IX_VehicleAssignments_VehicleId'
    ) THEN
        CREATE INDEX ""IX_VehicleAssignments_VehicleId"" ON ""VehicleAssignments"" (""VehicleId"");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = current_schema() AND indexname = 'IX_VehicleAssignments_UserId'
    ) THEN
        CREATE INDEX ""IX_VehicleAssignments_UserId"" ON ""VehicleAssignments"" (""UserId"");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = current_schema() AND indexname = 'IX_VehicleAssignments_IsActive'
    ) THEN
        CREATE INDEX ""IX_VehicleAssignments_IsActive"" ON ""VehicleAssignments"" (""IsActive"");
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
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'VehicleAssignments'
    ) THEN
        DROP TABLE ""VehicleAssignments"";
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Vehicles' AND column_name = 'HoldReason'
    ) THEN
        ALTER TABLE ""Vehicles"" DROP COLUMN ""HoldReason"";
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Vehicles' AND column_name = 'IsOnHold'
    ) THEN
        ALTER TABLE ""Vehicles"" DROP COLUMN ""IsOnHold"";
    END IF;
END $$;
");
    }
}
