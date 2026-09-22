import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/api/admin";
import { PageHeader } from "@/components/PageHeader";
import { CompletionBadge, WorkflowBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { deliveryLabel, formatDateTime, locationLabel } from "@/lib/format";

export function AdminRecordDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const lookups = useQuery({ queryKey: ["admin-lookups"], queryFn: adminApi.lookups });
  const query = useQuery({
    queryKey: ["admin-record", id],
    queryFn: () => adminApi.participation(id!),
    enabled: Boolean(id),
  });
  const record = query.data?.record;
  const [comment, setComment] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("PHYSICAL");
  const [roleId, setRoleId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [completionId, setCompletionId] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (!record) return;
    setDeliveryMode(record.deliveryMode);
    setRoleId(record.participationRole.id);
    setFromDate(record.fromDate.slice(0, 10));
    setToDate(record.toDate.slice(0, 10));
    setCompletionId(record.completionStatus.id);
    setRemarks(record.remarks ?? "");
  }, [record]);

  if (query.isLoading) return <div className="text-sm text-slate-500">Loading record…</div>;
  if (query.error || !record) {
    return <div className="text-sm text-red-700">{query.error?.message ?? "Record not found"}</div>;
  }

  async function act(kind: "approve" | "return" | "reject") {
    try {
      if (kind === "approve") await adminApi.approveParticipation(id!);
      if (kind === "return") await adminApi.returnParticipation(id!, comment);
      if (kind === "reject") await adminApi.rejectParticipation(id!, comment);
      toast.success("Workflow updated");
      await queryClient.invalidateQueries({ queryKey: ["admin-record", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-records"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-summary"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update workflow");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Record detail" actions={<Link to="/admin/records"><Button variant="secondary">Back</Button></Link>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Officer</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-slate-500">Full Name:</span> {record.officer.fullName}</p>
            <p><span className="text-slate-500">Bank ID:</span> {record.officer.bankId}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Training Program</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-slate-500">Program:</span> {record.trainingProgram.name}</p>
            <p><span className="text-slate-500">Local / Foreign:</span> {locationLabel(record.trainingProgram.locationScope)}</p>
            <p><span className="text-slate-500">Type:</span> {record.trainingProgram.trainingType.name}</p>
            <p><span className="text-slate-500">Institution:</span> {record.trainingProgram.institution.name}</p>
            <p><span className="text-slate-500">Venue:</span> {record.trainingProgram.venue}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Participation</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Physical / Online</Label>
            <Select value={deliveryMode} onChange={(e) => setDeliveryMode(e.target.value)}>
              {["PHYSICAL", "ONLINE", "HYBRID"].map((item) => <option key={item} value={item}>{deliveryLabel(item)}</option>)}
            </Select>
          </div>
          <div>
            <Label>Participating As</Label>
            <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              {lookups.data?.participationRoles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>From</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div>
            <Label>Completion Status</Label>
            <Select value={completionId} onChange={(e) => setCompletionId(e.target.value)}>
              {lookups.data?.completionStatuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          <div>
            <Button
              onClick={async () => {
                try {
                  await adminApi.updateParticipation(id!, {
                    deliveryMode,
                    participationRoleId: roleId,
                    fromDate,
                    toDate,
                    completionStatusId: completionId,
                    remarks,
                  });
                  toast.success("Correction saved");
                  await queryClient.invalidateQueries({ queryKey: ["admin-record", id] });
                  await queryClient.invalidateQueries({ queryKey: ["admin-records"] });
                  await queryClient.invalidateQueries({ queryKey: ["admin-summary"] });
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Unable to save correction");
                }
              }}
            >
              Save correction
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Administration</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Workflow: <WorkflowBadge status={record.workflowStatus} /></p>
          <p>Completion: <CompletionBadge status={record.completionStatus.name} /></p>
          <p>Submitted at: {formatDateTime(record.submittedAt)}</p>
          <p>Approved at: {formatDateTime(record.approvedAt)}</p>
          <p>Approved by: {record.approvedBy?.fullName ?? "—"}</p>
          <p>Last updated: {formatDateTime(record.updatedAt)}</p>
          {record.adminComment ? <p>Return / reject reason: {record.adminComment}</p> : null}
          {record.workflowStatus === "SUBMITTED" ? (
            <div className="space-y-3 pt-2">
              <div>
                <Label>Return / reject note</Label>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void act("approve")}>Approve</Button>
                <Button variant="secondary" onClick={() => void act("return")}>Return</Button>
                <Button variant="danger" onClick={() => void act("reject")}>Reject</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Audit history</CardTitle></CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            {(query.data?.audit ?? []).map((item) => (
              <li key={String(item.id)} className="border-b border-slate-100 pb-2">
                <p className="font-medium text-navy">{String(item.action)}</p>
                <p className="text-slate-500">{formatDateTime(String(item.createdAt))} — {(item.actor as { fullName?: string } | null)?.fullName ?? "System"}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
