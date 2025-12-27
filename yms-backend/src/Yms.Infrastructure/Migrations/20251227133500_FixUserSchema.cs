using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

using Yms.Infrastructure.Data;

#nullable disable

namespace Yms.Infrastructure.Migrations;

[DbContext(typeof(YmsDbContext))]
[Migration("20251227133500_FixUserSchema")]
public partial class FixUserSchema : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Users' AND column_name = 'FullName'
    ) THEN
        ALTER TABLE ""Users"" ADD COLUMN ""FullName"" character varying(100) NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Users' AND column_name = 'Phone'
    ) THEN
        ALTER TABLE ""Users"" ADD COLUMN ""Phone"" character varying(20) NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Users' AND column_name = 'IsActive'
    ) THEN
        ALTER TABLE ""Users"" ADD COLUMN ""IsActive"" boolean NOT NULL DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Users' AND column_name = 'LastLogin'
    ) THEN
        ALTER TABLE ""Users"" ADD COLUMN ""LastLogin"" timestamp with time zone NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Users' AND column_name = 'UpdatedAt'
    ) THEN
        ALTER TABLE ""Users"" ADD COLUMN ""UpdatedAt"" timestamp with time zone NULL;
    END IF;
END $$;
");

        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Users' AND column_name = 'Role' AND data_type = 'integer'
    ) THEN
        ALTER TABLE ""Users"" ALTER COLUMN ""Role"" TYPE character varying(50)
        USING (
            CASE ""Role""
                WHEN 1 THEN 'Admin'
                WHEN 2 THEN 'YardManager'
                WHEN 3 THEN 'YardJockey'
                WHEN 4 THEN 'GateSecurity'
                WHEN 5 THEN 'Driver'
                WHEN 6 THEN 'ViewOnly'
                WHEN 7 THEN 'Operator'
                ELSE 'ViewOnly'
            END
        );
    END IF;
END $$;
");

        // Role conversion is handled by SQL above when Role is still integer.
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Users' AND column_name = 'Role' AND data_type = 'character varying'
    ) THEN
        ALTER TABLE ""Users"" ALTER COLUMN ""Role"" TYPE integer
        USING (
            CASE lower(""Role"")
                WHEN 'admin' THEN 1
                WHEN 'yardmanager' THEN 2
                WHEN 'yardjockey' THEN 3
                WHEN 'gatesecurity' THEN 4
                WHEN 'driver' THEN 5
                WHEN 'viewonly' THEN 6
                WHEN 'operator' THEN 7
                ELSE 6
            END
        );
    END IF;
END $$;
");

        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Users' AND column_name = 'FullName') THEN
        ALTER TABLE ""Users"" DROP COLUMN ""FullName"";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Users' AND column_name = 'Phone') THEN
        ALTER TABLE ""Users"" DROP COLUMN ""Phone"";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Users' AND column_name = 'IsActive') THEN
        ALTER TABLE ""Users"" DROP COLUMN ""IsActive"";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Users' AND column_name = 'LastLogin') THEN
        ALTER TABLE ""Users"" DROP COLUMN ""LastLogin"";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Users' AND column_name = 'UpdatedAt') THEN
        ALTER TABLE ""Users"" DROP COLUMN ""UpdatedAt"";
    END IF;
END $$;
");
    }
}
