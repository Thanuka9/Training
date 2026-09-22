import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { locationLabel } from "@/lib/format";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { TrainingProgram } from "@/types";

function iso(value?: string) {
  return value ? value.slice(0, 10) : "";
}

export function ParticipationFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 250);
  const [programId, setProgramId] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [deliveryMode, setDeliveryMode] = useState("PHYSICAL");
  const [roleId, setRoleId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [completionId, setCompletionId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"draft" | "submit" | null>(null);
  const [saving, setSaving] = useState(false);

  const lookups = useQuery({ queryKey: ["lookups"], queryFn: userApi.lookups });
  const programs = useQuery({
    queryKey: ["user-programs", debouncedSearch],
    queryFn: () =>
      userApi.programs({
        search: debouncedSearch || undefined,
        pageSize: 300,
        active: "true",
      }),
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
    setSelectedProgram(record.trainingProgram);
    setDeliveryMode(record.deliveryMode);
    setRoleId(record.participationRole.id);
    setFromDate(iso(record.fromDate));
    setToDate(iso(record.toDate));
    setCompletionId(record.completionStatus.id);
    setRemarks(record.remarks ?? "");
    setSearch(record.trainingProgram.name);
  }, [existing.data]);

  const programOptions = useMemo(() => {
    const items = [...(programs.data?.items ?? [])];
    const q = search.trim().toLowerCase();
    // Local filter while typing (before debounce catches up with the API).
    const filtered =
      q && debouncedSearch !== search.trim() ? items.filter((item) => matchesProgram(item, q)) : items;
    if (selectedProgram && !filtered.some((item) => item.id === selectedProgram.id)) {
      filtered.unshift(selectedProgram);
    }
    return filtered;
  }, [programs.data, search, debouncedSearch, selectedProgram]);

  const deliveryOptions = lookups.data?.allowHybridDelivery
    ? ["PHYSICAL", "ONLINE", "HYBRID"]
    : ["PHYSICAL", "ONLINE"];

  const locked = existing.data
    ? !["DRAFT", "RETURNED"].includes(existing.data.workflowStatus)
    : false;

  async function save(submit: boolean, confirmDuplicate = false) {
    if (!programId) {
      toast.error("Select a training programme");
      return;
    }
    if (!roleId || !completionId || !fromDate || !toDate) {
      toast.error("Fill participation role, dates, and completion status");
      return;
    }

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

    setSaving(true);
    try {
      const record = isEdit
        ? await userApi.updateParticipation(id!, payload)
        : await userApi.createParticipation(payload);
      if (submit) {
        await userApi.submitParticipation(record.id);
        toast.success("Submitted for admin review — visible under Participation Records → Pending Review");
      } else {
        toast.success("Draft saved");
      }
      await queryClient.invalidateQueries({ queryKey: ["my-training"] });
      await queryClient.invalidateQueries({ queryKey: ["user-dashboard"] });
      navigate(submit ? "/app/training?workflowStatus=SUBMITTED" : "/app/training");
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "DUPLICATE_PARTICIPATION") {
        setPendingAction(submit ? "submit" : "draft");
        setConfirmOpen(true);
        return;
      }
      toast.error(error instanceof Error ? error.message : "Unable to save record");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEdit ? "Training Record" : "Add Training Record"}
        description="Choose a programme, then enter your participation details. Submit sends it to administrators for review."
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
          <CardTitle>Training programme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="program">Programme</Label>
            <SearchableSelect
              id="program"
              value={programId}
              options={programOptions.map((item) => ({
                id: item.id,
                label: item.name,
                description: `${item.institution.name} · ${item.trainingType.name}${item.venue ? ` · ${item.venue}` : ""}`,
              }))}
              searchValue={search}
              onSearchChange={setSearch}
              onChange={(nextId) => {
                setProgramId(nextId);
                if (!nextId) {
                  setSelectedProgram(null);
                  setSearch("");
                  return;
                }
                const chosen = programOptions.find((item) => item.id === nextId) ?? null;
                setSelectedProgram(chosen);
                if (chosen) setSearch(chosen.name);
              }}
              disabled={locked}
              loading={programs.isLoading || programs.isFetching}
              placeholder={programs.isLoading ? "Loading programmes…" : "Search and select a programme"}
              searchPlaceholder="Type programme, institution, type or venue"
              emptyMessage={debouncedSearch ? "No programmes match that search" : "No active programmes"}
            />
            <p className="mt-1.5 text-xs text-muted">
              {programs.isFetching
                ? "Searching…"
                : programs.data
                  ? debouncedSearch
                    ? `${programOptions.length} match${programOptions.length === 1 ? "" : "es"}`
                    : `${Math.min(programOptions.length, programs.data.total)} of ${programs.data.total} programmes`
                  : null}
            </p>
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
            <p className="text-sm text-slate-500">Open the dropdown and type to find a programme.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participation details</CardTitle>
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
            <Select id="role" value={roleId} onChange={(e) => setRoleId(e.target.value)} disabled={locked} required>
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
            <Select
              id="completion"
              value={completionId}
              onChange={(e) => setCompletionId(e.target.value)}
              disabled={locked}
              required
            >
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
            <Button disabled={saving} onClick={() => void save(false)}>
              {saving ? "Saving…" : "Save Draft"}
            </Button>
            <Button variant="gold" disabled={saving} onClick={() => void save(true)}>
              {saving ? "Submitting…" : "Submit for review"}
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

function matchesProgram(item: TrainingProgram, q: string) {
  return [item.name, item.institution.name, item.trainingType.name, item.venue, item.description ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}
