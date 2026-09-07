import { useState, useCallback, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  Clock,
  MapPin,
  QrCode,
  Award,
  Building,
  RefreshCw,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ToneBadge } from "@/components/status-badge";
import { QRCode } from "@/components/qr-code";
import { getMyEventPermissionsApi } from "@/lib/api/clubs.server";
import type { DBEventParticipant } from "@/lib/db/clubs.server";

export const Route = createFileRoute("/student/event-permissions")({
  head: () => ({ meta: [{ title: "My Club Event Permissions — Student Portal" }] }),
  component: StudentEventPermissionsPage,
});

function StudentEventPermissionsPage() {
  const [eventPermissions, setEventPermissions] = useState<DBEventParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected permission for QR Modal
  const [selectedPermForQR, setSelectedPermForQR] = useState<DBEventParticipant | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const perms = await getMyEventPermissionsApi();
      setEventPermissions(perms);
    } catch (err: any) {
      toast.error(err.message || "Failed to load event permissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenQR = (perm: DBEventParticipant) => {
    setSelectedPermForQR(perm);
    setQrModalOpen(true);
  };

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="space-y-6">
        <PageHeader
          title="My Club Event Permissions"
          description="View official club event participation passes granted by your faculty coordinators."
          actions={
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2 font-bold">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />

        {/* Informational Banner */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3 text-xs text-foreground font-medium">
          <Info className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-primary">Automatic Approval & Digital Event Passes</p>
            <p className="text-muted-foreground">
              When your Faculty Coordinator grants permission for an official club event, your permission code (`EP-xxxx`) is generated automatically. Use the digital pass QR code at Security Gate for outside-campus events or classroom movement verification.
            </p>
          </div>
        </div>

        {/* Permissions Grid */}
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
            Loading your event permissions...
          </div>
        ) : eventPermissions.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
            <Award className="size-10 mx-auto text-muted-foreground/60" />
            <div>
              <h3 className="text-base font-bold text-foreground">No Event Permissions Found</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                You do not currently have any active club event participation permissions.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {eventPermissions.map((perm) => (
              <div
                key={perm.id}
                className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs hover:border-primary/40 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider mb-1">
                      {perm.club_name}
                    </span>
                    <h3 className="text-base font-bold text-foreground">{perm.event_name}</h3>
                    <p className="font-mono text-xs font-bold text-primary mt-0.5">
                      Pass Code: {perm.permission_code}
                    </p>
                  </div>
                  <ToneBadge tone={perm.permission_status === "APPROVED" ? "success" : "neutral"}>
                    {perm.permission_status}
                  </ToneBadge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-3.5 text-primary shrink-0" />
                    <span className="truncate">Date: <strong className="text-foreground">{perm.event_date}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5 text-primary shrink-0" />
                    <span className="truncate"><strong className="text-foreground">{perm.start_time} - {perm.end_time}</strong></span>
                  </div>

                  <div className="flex items-center gap-2 col-span-2">
                    <MapPin className="size-3.5 text-primary shrink-0" />
                    <span>Venue: <strong className="text-foreground">{perm.location}</strong> ({perm.location_type})</span>
                  </div>

                  <div className="flex items-center gap-2 col-span-2 pt-1 border-t border-border/60">
                    <Building className="size-3.5 text-primary shrink-0" />
                    <span>Coordinator: <strong className="text-foreground">{perm.coordinator_name}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-border gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Granted: {new Date(perm.created_at).toLocaleDateString()}
                  </span>

                  <Button
                    onClick={() => handleOpenQR(perm)}
                    size="sm"
                    className="gap-2 font-bold shadow-xs w-full sm:w-auto"
                  >
                    <QrCode className="size-4" />
                    Digital Event Pass
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Event Pass QR Code Modal */}
        <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">Official Event Digital Pass</DialogTitle>
            </DialogHeader>

            {selectedPermForQR && (
              <div className="space-y-4 text-center py-2">
                <div className="bg-white p-4 rounded-2xl border border-border inline-block shadow-sm">
                  <QRCode value={selectedPermForQR.permission_code} size={200} />
                </div>

                <div className="space-y-1">
                  <p className="font-mono text-lg font-black text-primary">{selectedPermForQR.permission_code}</p>
                  <p className="text-sm font-bold text-foreground">{selectedPermForQR.event_name}</p>
                  <p className="text-xs text-muted-foreground font-medium">{selectedPermForQR.club_name}</p>
                </div>

                <div className="bg-muted/50 p-3 rounded-xl border border-border text-xs text-left space-y-1 font-medium">
                  <p><strong className="text-foreground">Student:</strong> {selectedPermForQR.student_name} ({selectedPermForQR.student_code})</p>
                  <p><strong className="text-foreground">Department:</strong> {selectedPermForQR.department} &bull; {selectedPermForQR.year}</p>
                  <p><strong className="text-foreground">Venue:</strong> {selectedPermForQR.location} ({selectedPermForQR.location_type})</p>
                  <p><strong className="text-foreground">Time Window:</strong> {selectedPermForQR.event_date} | {selectedPermForQR.start_time} - {selectedPermForQR.end_time}</p>
                </div>

                <DialogFooter className="pt-2">
                  <Button variant="outline" onClick={() => setQrModalOpen(false)} className="w-full font-bold">
                    Close Pass
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
