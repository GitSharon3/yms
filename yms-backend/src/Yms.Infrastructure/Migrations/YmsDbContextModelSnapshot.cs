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
            b.Property<DateTime?>("UpdatedAt").HasColumnType("timestamp with time zone");

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

        modelBuilder.Entity("Yms.Core.Entities.GateAuditEvent", b =>
        {
            b.Property<Guid>("Id").HasColumnType("uuid");
            b.Property<string>("Action").IsRequired().HasMaxLength(80).HasColumnType("character varying(80)");
            b.Property<Guid>("ActorUserId").HasColumnType("uuid");
            b.Property<string>("ActorRole").IsRequired().HasMaxLength(50).HasColumnType("character varying(50)");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<string>("DetailsJson").HasColumnType("text");
            b.Property<string>("DockOrParking").HasMaxLength(120).HasColumnType("character varying(120)");
            b.Property<Guid?>("DriverId").HasColumnType("uuid");
            b.Property<string>("GateName").IsRequired().HasMaxLength(80).HasColumnType("character varying(80)");
            b.Property<DateTime>("OccurredAtUtc").HasColumnType("timestamp with time zone");
            b.Property<string>("Outcome").IsRequired().HasMaxLength(80).HasColumnType("character varying(80)");
            b.Property<string>("SealNumber").HasMaxLength(60).HasColumnType("character varying(60)");
            b.Property<string>("TrailerNumber").HasMaxLength(60).HasColumnType("character varying(60)");
            b.Property<DateTime?>("UpdatedAt").HasColumnType("timestamp with time zone");
            b.Property<Guid?>("VehicleId").HasColumnType("uuid");

            b.HasKey("Id");
            b.HasIndex("Action");
            b.HasIndex("DriverId");
            b.HasIndex("GateName");
            b.HasIndex("OccurredAtUtc");
            b.HasIndex("VehicleId");

            b.ToTable("GateAuditEvents");
        });

        modelBuilder.Entity("Yms.Core.Entities.User", b =>
        {
            b.Property<Guid>("Id").HasColumnType("uuid");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<string>("FullName").IsRequired().HasMaxLength(100).HasColumnType("character varying(100)");
            b.Property<string>("Email").IsRequired().HasMaxLength(254).HasColumnType("character varying(254)");
            b.Property<bool>("IsActive").HasColumnType("boolean");
            b.Property<DateTime?>("LastLogin").HasColumnType("timestamp with time zone");
            b.Property<byte[]>("PasswordHash").IsRequired().HasColumnType("bytea");
            b.Property<int>("PasswordIterations").HasColumnType("integer");
            b.Property<byte[]>("PasswordSalt").IsRequired().HasColumnType("bytea");
            b.Property<string>("Phone").IsRequired().HasMaxLength(20).HasColumnType("character varying(20)");
            b.Property<string>("Role").IsRequired().HasMaxLength(50).HasColumnType("character varying(50)");
            b.Property<DateTime?>("UpdatedAt").HasColumnType("timestamp with time zone");
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
            b.Property<string>("HoldReason").HasMaxLength(250).HasColumnType("character varying(250)");
            b.Property<bool>("IsOnHold").HasColumnType("boolean");
            b.Property<string>("LicensePlate").HasMaxLength(30).HasColumnType("character varying(30)");
            b.Property<int>("Status").HasColumnType("integer");
            b.Property<int>("Type").HasColumnType("integer");
            b.Property<DateTime?>("UpdatedAt").HasColumnType("timestamp with time zone");
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

        modelBuilder.Entity("Yms.Core.Entities.VehicleAssignment", b =>
        {
            b.Property<Guid>("Id").HasColumnType("uuid");
            b.Property<string>("AssignmentRole").IsRequired().HasMaxLength(30).HasColumnType("character varying(30)");
            b.Property<DateTime>("AssignedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<DateTime>("CreatedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<bool>("IsActive").HasColumnType("boolean");
            b.Property<DateTime?>("UnassignedAtUtc").HasColumnType("timestamp with time zone");
            b.Property<DateTime?>("UpdatedAt").HasColumnType("timestamp with time zone");
            b.Property<Guid>("UserId").HasColumnType("uuid");
            b.Property<Guid>("VehicleId").HasColumnType("uuid");

            b.HasKey("Id");
            b.HasIndex("IsActive");
            b.HasIndex("UserId");
            b.HasIndex("VehicleId");

            b.ToTable("VehicleAssignments");
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

        modelBuilder.Entity("Yms.Core.Entities.GateAuditEvent", b =>
        {
            b.HasOne("Yms.Core.Entities.Driver", null)
                .WithMany()
                .HasForeignKey("DriverId")
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne("Yms.Core.Entities.Vehicle", null)
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

        modelBuilder.Entity("Yms.Core.Entities.VehicleAssignment", b =>
        {
            b.HasOne("Yms.Core.Entities.User", "User")
                .WithMany()
                .HasForeignKey("UserId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            b.HasOne("Yms.Core.Entities.Vehicle", "Vehicle")
                .WithMany()
                .HasForeignKey("VehicleId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            b.Navigation("User");
            b.Navigation("Vehicle");
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
