namespace Yms.Core.Enums;

public enum VehicleStatus
{
    InYard = 1,
    InQueue = 2,
    AtDock = 3,
    Departed = 4,

    PreArrival = 10,
    VehicleArrival = 11,
    GateCheckIn = 12,
    YardEntryAuthorization = 13,
    YardEntryLogged = 14,
    ParkingAssigned = 15,
    DockAssigned = 16,
    TrailerMovement = 17,
    LoadUnloadInProgress = 18,
    OperationsComplete = 19,
    YardExitAuthorization = 20,
    ExitDocumentsProcessing = 21,
    GateCheckOut = 22
}
