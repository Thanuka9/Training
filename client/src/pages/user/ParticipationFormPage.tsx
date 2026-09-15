import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { userApi } from "@/api/user";
import { ApiRequestError } from "@/api/client";
import { useAuth } from "@/features/auth/AuthProvider";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/dialog";
import { locationLabel } from "@/lib/format";
import type { TrainingProgram } from "@/types";

function iso(value?: string) {
  return value ? value.slice(0, 10) : "";
}

export function ParticipationFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [programId, setProgramId] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("PHYSICAL");
  const [roleId, setRoleId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [completionId, setCompletionId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"draft" | "submit" | null>(null);

  const lookups = useQuery({ queryKey: ["lookups"], queryFn: userApi.lookups });
  const programs = useQuery({
    queryKey: ["user-programs", search],
    queryFn: () => userApi.programs({ search, pageSize: 50 }),
  });
  const existing = useQuery({
    queryKey: ["my-participation", id],
    queryFn: () => userApi.participation(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    const record = existing.data;
    if (!record) return;
    setProgramId(record.trainingProgram.id);
    setDeliveryMode(record.deliveryMode);
    setRoleId(record.participationRole.id);
    setFromDate(iso(record.fromDate));
    setToDate(iso(record.toDate));
    setCompletionId(record.completionStatus.id);
    setRemarks(record.remarks ?? "");
  }, [existing.data]);

  const selectedProgram: TrainingProgram | undefined = useMemo(() => {
    return (
      programs.data?.items.find((item) => item.id === programId) ||
      existing.data?.trainingProgram
    );
  }, [programId, programs.data, existing.data]);

  const deliveryOptions = lookups.data?.allowHybridDelivery
    ? ["PHYSICAL", "ONLINE", "HYBRID"]
    : ["PHYSICAL", "ONLINE"];

  const locked = existing.data
    ? !["DRAFT", "RETURNED"].includes(existing.data.workflowStatus)
    : false;

  async function save(submit: boolean, confirmDuplicate = false) {
    const payload = {
      trainingProgramId: programId,
      deliveryMode,
      participationRoleId: roleId,
      fromDate,
      toDate,
      completionStatusId: completionId,
      remarks: remarks || null,
      confirmDuplicate,
    };

    try {
      const record = isEdit
        ? await userApi.updateParticipation(id!, payload)
        : await userApi.createParticipation(payload);
      if (submit) {
        await userApi.submitParticipation(record.id);
        toast.success("Record submitted for review");
      } else {
        toast.success("Draft saved");
      }
      navigate("/app/training");
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "DUPLICATE_PARTICIPATION") {
        setPendingAction(submit ? "submit" : "draft");
        setConfirmOpen(true);
        return;
      }
      toast.error(error instanceof Error ? error.message : "Unable to save record");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEdit ? "Training Record" : "Add Training Record"}
        description="Record your participation in an existing training programme."
      />
      {existing.data?.workflowStatus === "RETURNED" && existing.data.adminComment ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Returned for correction: {existing.data.adminComment}
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Officer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Officer Name</Label>
            <Input value={user?.fullName ?? ""} readOnly disabled />
          </div>
          <div>
            <Label>Bank ID</Label>
            <Input value={user?.bankId ?? ""} readOnly disabled />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Step 1 – Select Training Program</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="programSearch">Search programmes</Label>
            <Input
              id="programSearch"
              placeholder="Programme name or institution"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={locked}
            />
          </div>
          <div>
            <Label htmlFor="program">Training Program</Label>
            <Select id="program" value={programId} onChange={(e) => setProgramId(e.target.value)} disabled={locked} required>
              <option value="">Select a programme</option>
              {(programs.data?.items ?? (selectedProgram ? [selectedProgram] : [])).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {item.institution.name}
                </option>
              ))}
            </Select>
          </div>
          {selectedProgram ? (
            <div className="grid gap-4 rounded-lg border border-gold/40 bg-[#fbf7ee] p-4 sm:grid-cols-2">
              <p className="sm:col-span-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-700">
                Programme details (Admin-controlled)
              </p>
              <ReadOnly label="Name of the Training Program" value={selectedProgram.name} />
              <ReadOnly label="Local / Foreign" value={locationLabel(selectedProgram.locationScope)} />
              <ReadOnly label="Type of Training" value={selectedProgram.trainingType.name} />
              <ReadOnly label="Institution" value={selectedProgram.institution.name} />
              <ReadOnly label="Venue" value={selectedProgram.venue} />
              <ReadOnly label="Description" value={selectedProgram.description?.trim() || "—"} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">Programme details will appear after selection.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Step 2 – Participation Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="delivery">Physical / Online</Label>
            <Select id="delivery" value={deliveryMode} onChange={(e) => setDeliveryMode(e.target.value)} disabled={locked}>
              {deliveryOptions.map((item) => (
                <option key={item} value={item}>
                  {item.charAt(0) + item.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="role">Participating the Training as</Label>
            <Select id="role" value={roleId} onChange={(e) => setRoleId(e.target.value)} disabled={locked}>
              <option value="">Select</option>
              {lookups.data?.participationRoles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="fromDate">From Date</Label>
            <Input id="fromDate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={locked} required />
          </div>
          <div>
            <Label htmlFor="toDate">To Date</Label>
            <Input id="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={locked} required />
          </div>
          <div>
            <Label htmlFor="completion">Status of Completion</Label>
            <Select id="completion" value={completionId} onChange={(e) => setCompletionId(e.target.value)} disabled={locked}>
              <option value="">Select</option>
              {lookups.data?.completionStatuses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="remarks">Optional Remarks</Label>
            <Textarea id="remarks" maxLength={2000} value={remarks} onChange={(e) => setRemarks(e.target.value)} disabled={locked} />
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        {!locked ? (
          <>
            <Button onClick={() => void save(false)}>Save Draft</Button>
            <Button variant="gold" onClick={() => void save(true)}>
              Submit
            </Button>
          </>
        ) : null}
        <Link to="/app/training">
          <Button variant="secondary">Cancel</Button>
        </Link>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Possible duplicate"
        description="A record already exists for this programme and date range. Save anyway?"
        confirmLabel="Save anyway"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void save(pendingAction === "submit", true);
        }}
      />
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}
