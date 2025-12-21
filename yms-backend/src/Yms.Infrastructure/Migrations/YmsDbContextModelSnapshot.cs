using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

using Yms.Infrastructure.Data;

#nullable disable

namespace Yms.Infrastructure.Migrations;

[DbContext(typeof(YmsDbContext))]
partial class YmsDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasAnnotation("ProductVersion", "8.0.11")
            .HasAnnotation("Relational:MaxIdentifierLength", 63);

        modelBuilder.Entity("Yms.Core.Entities.Appointment", b =>
        {
            b.Property<Guid>("Id").HasColumnType("uuid");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<Guid?>("DockId").HasColumnType("uuid");
            b.Property<DateTime>("ScheduledEndUtc").HasColumnType("timestamp with time zone");
            b.Property<DateTime>("ScheduledStartUtc").HasColumnType("timestamp with time zone");
            b.Property<int>("Status").HasColumnType("integer");
            b.Property<Guid?>("VehicleId").HasColumnType("uuid");
            b.Property<Guid>("YardId").HasColumnType("uuid");

            b.HasKey("Id");
            b.HasIndex("DockId");
            b.HasIndex("ScheduledStartUtc");
            b.HasIndex("Status");
            b.HasIndex("VehicleId");
            b.HasIndex("YardId");

            b.ToTable("Appointments");
        });

        modelBuilder.Entity("Yms.Core.Entities.Dock", b =>
        {
            b.Property<Guid>("Id").HasColumnType("uuid");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<string>("Name").IsRequired().HasMaxLength(100).HasColumnType("character varying(100)");
            b.Property<int>("Status").HasColumnType("integer");
            b.Property<Guid>("YardId").HasColumnType("uuid");

            b.HasKey("Id");
            b.HasIndex("Status");
            b.HasIndex("YardId");
            b.HasIndex("YardId", "Name").IsUnique();

            b.ToTable("Docks");
        });

        modelBuilder.Entity("Yms.Core.Entities.Driver", b =>
        {
            b.Property<Guid>("Id").HasColumnType("uuid");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<string>("FirstName").IsRequired().HasMaxLength(80).HasColumnType("character varying(80)");
            b.Property<string>("LastName").IsRequired().HasMaxLength(80).HasColumnType("character varying(80)");
            b.Property<string>("Phone").HasMaxLength(30).HasColumnType("character varying(30)");

            b.HasKey("Id");
            b.HasIndex("Phone");

            b.ToTable("Drivers");
        });

        modelBuilder.Entity("Yms.Core.Entities.GateActivity", b =>
        {
            b.Property<Guid>("Id").HasColumnType("uuid");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<Guid?>("DriverId").HasColumnType("uuid");
            b.Property<string>("GateName").IsRequired().HasMaxLength(80).HasColumnType("character varying(80)");
            b.Property<DateTime>("OccurredAtUtc").HasColumnType("timestamp with time zone");
            b.Property<int>("Type").HasColumnType("integer");
            b.Property<Guid?>("VehicleId").HasColumnType("uuid");

            b.HasKey("Id");
            b.HasIndex("DriverId");
            b.HasIndex("OccurredAtUtc");
            b.HasIndex("Type");
            b.HasIndex("VehicleId");

            b.ToTable("GateActivities");
        });

        modelBuilder.Entity("Yms.Core.Entities.User", b =>
        {
            b.Property<Guid>("Id").HasColumnType("uuid");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<string>("Email").IsRequired().HasMaxLength(254).HasColumnType("character varying(254)");
            b.Property<byte[]>("PasswordHash").IsRequired().HasColumnType("bytea");
            b.Property<int>("PasswordIterations").HasColumnType("integer");
            b.Property<byte[]>("PasswordSalt").IsRequired().HasColumnType("bytea");
            b.Property<int>("Role").HasColumnType("integer");
            b.Property<string>("Username").IsRequired().HasMaxLength(50).HasColumnType("character varying(50)");

            b.HasKey("Id");
            b.HasIndex("Email").IsUnique();
            b.HasIndex("Username").IsUnique();

            b.ToTable("Users");
        });

        modelBuilder.Entity("Yms.Core.Entities.Vehicle", b =>
        {
            b.Property<Guid>("Id").HasColumnType("uuid");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<Guid?>("DockId").HasColumnType("uuid");
            b.Property<Guid?>("DriverId").HasColumnType("uuid");
            b.Property<int>("Status").HasColumnType("integer");
            b.Property<int>("Type").HasColumnType("integer");
            b.Property<string>("VehicleNumber").IsRequired().HasMaxLength(40).HasColumnType("character varying(40)");
            b.Property<Guid?>("YardSectionId").HasColumnType("uuid");

            b.HasKey("Id");
            b.HasIndex("DockId");
            b.HasIndex("DriverId");
            b.HasIndex("Status");
            b.HasIndex("VehicleNumber").IsUnique();
            b.HasIndex("YardSectionId");

            b.ToTable("Vehicles");
        });

        modelBuilder.Entity("Yms.Core.Entities.Yard", b =>
        {
            b.Property<Guid>("Id").HasColumnType("uuid");
            b.Property<string>("Address").HasMaxLength(500).HasColumnType("character varying(500)");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<string>("Name").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)");

            b.HasKey("Id");

            b.ToTable("Yards");
        });

        modelBuilder.Entity("Yms.Core.Entities.YardSection", b =>
        {
            b.Property<Guid>("Id").HasColumnType("uuid");
            b.Property<int>("Capacity").HasColumnType("integer");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<string>("Name").IsRequired().HasMaxLength(100).HasColumnType("character varying(100)");
            b.Property<Guid>("YardId").HasColumnType("uuid");

            b.HasKey("Id");
            b.HasIndex("YardId");
            b.HasIndex("YardId", "Name").IsUnique();

            b.ToTable("YardSections");
        });

        modelBuilder.Entity("Yms.Core.Entities.Appointment", b =>
        {
            b.HasOne("Yms.Core.Entities.Dock", "Dock")
                .WithMany()
                .HasForeignKey("DockId")
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne("Yms.Core.Entities.Vehicle", "Vehicle")
                .WithMany()
                .HasForeignKey("VehicleId")
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne("Yms.Core.Entities.Yard", "Yard")
                .WithMany()
                .HasForeignKey("YardId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();
        });

        modelBuilder.Entity("Yms.Core.Entities.Dock", b =>
        {
            b.HasOne("Yms.Core.Entities.Yard", "Yard")
                .WithMany("Docks")
                .HasForeignKey("YardId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            b.Navigation("Yard");
        });

        modelBuilder.Entity("Yms.Core.Entities.GateActivity", b =>
        {
            b.HasOne("Yms.Core.Entities.Driver", "Driver")
                .WithMany()
                .HasForeignKey("DriverId")
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne("Yms.Core.Entities.Vehicle", "Vehicle")
                .WithMany()
                .HasForeignKey("VehicleId")
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity("Yms.Core.Entities.Vehicle", b =>
        {
            b.HasOne("Yms.Core.Entities.Dock", "Dock")
                .WithMany()
                .HasForeignKey("DockId")
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne("Yms.Core.Entities.Driver", "Driver")
                .WithMany()
                .HasForeignKey("DriverId")
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne("Yms.Core.Entities.YardSection", "YardSection")
                .WithMany("Vehicles")
                .HasForeignKey("YardSectionId")
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity("Yms.Core.Entities.YardSection", b =>
        {
            b.HasOne("Yms.Core.Entities.Yard", "Yard")
                .WithMany("Sections")
                .HasForeignKey("YardId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            b.Navigation("Yard");
        });

        modelBuilder.Entity("Yms.Core.Entities.Yard", b =>
        {
            b.Navigation("Docks");
            b.Navigation("Sections");
        });

        modelBuilder.Entity("Yms.Core.Entities.YardSection", b =>
        {
            b.Navigation("Vehicles");
        });
    }
}
