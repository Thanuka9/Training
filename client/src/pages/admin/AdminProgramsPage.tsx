import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/api/admin";
import { PageHeader, QueryState } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { locationLabel } from "@/lib/format";
import type { TrainingProgram } from "@/types";

export function AdminProgramsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<TrainingProgram> | null>(null);
  const [archive, setArchive] = useState<TrainingProgram | null>(null);
  const query = useQuery({
    queryKey: ["admin-programs", search],
    queryFn: () => adminApi.programs({ search, pageSize: 50 }),
  });

  return (
    <div>
      <PageHeader
        title="Training Programs"
        description="These records own the yellow workbook fields: programme name, local/foreign, type, institution and venue."
        actions={<Button onClick={() => setEditing({})}>Add Program</Button>}
      />
      <Card className="mb-4">
        <CardContent className="flex gap-3 pt-4">
          <Input placeholder="Search name, institution or venue" value={search} onChange={(e) => setSearch(e.target.value)} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <QueryState isLoading={query.isLoading} error={query.error} empty={!query.data?.items.length}>
            <Table>
              <THead>
                <tr>
                  <Th>Programme</Th>
                  <Th>Local / Foreign</Th>
                  <Th>Type</Th>
                  <Th>Institution</Th>
                  <Th>Venue</Th>
                  <Th>Status</Th>
                  <Th>Participants</Th>
                  <Th></Th>
                </tr>
              </THead>
              <tbody>
                {query.data?.items.map((item) => (
                  <tr key={item.id}>
                    <Td>{item.name}</Td>
                    <Td>{locationLabel(item.locationScope)}</Td>
                    <Td>{item.trainingType.name}</Td>
                    <Td>{item.institution.name}</Td>
                    <Td>{item.venue}</Td>
                    <Td>
                      <Badge tone={item.active ? "green" : "slate"}>{item.active ? "Active" : "Archived"}</Badge>
                    </Td>
                    <Td>{item._count?.participations ?? 0}</Td>
                    <Td className="space-x-2 whitespace-nowrap">
                      <button className="text-navy underline" onClick={() => setEditing(item)}>Edit</button>
                      {item.active ? (
                        <button className="text-red-700 underline" onClick={() => setArchive(item)}>Archive</button>
                      ) : (
                        <button className="text-navy underline" onClick={async () => {
                          await adminApi.updateProgram(item.id, { ...item, active: true, trainingTypeId: item.trainingType.id, institutionId: item.institution.id });
                          await queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
                        }}>Reactivate</button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>
      {editing ? (
        <ProgramModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
          }}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(archive)}
        title="Archive programme"
        description="The programme will no longer appear for new participation records."
        danger
        onClose={() => setArchive(null)}
        onConfirm={async () => {
          if (!archive) return;
          await adminApi.archiveProgram(archive.id);
          toast.success("Programme archived");
          setArchive(null);
          await queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
        }}
      />
    </div>
  );
}

function ProgramModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Partial<TrainingProgram>;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const lookups = useQuery({ queryKey: ["admin-lookups"], queryFn: adminApi.lookups });
  const [name, setName] = useState(initial.name ?? "");
  const [locationScope, setLocationScope] = useState(initial.locationScope ?? "LOCAL");
  const [trainingTypeId, setTrainingTypeId] = useState(initial.trainingType?.id ?? "");
  const [institutionId, setInstitutionId] = useState(initial.institution?.id ?? "");
  const [institutionName, setInstitutionName] = useState("");
  const [venue, setVenue] = useState(initial.venue ?? "");
  const [description, setDescription] = useState(initial.description ?? "");

  return (
    <Modal open title={initial.id ? "Edit programme" : "Add programme"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const payload = {
            name,
            locationScope,
            trainingTypeId,
            institutionId: institutionId || undefined,
            institutionName: institutionName || undefined,
            venue,
            description,
          };
          try {
            if (initial.id) await adminApi.updateProgram(initial.id, payload);
            else await adminApi.createProgram(payload);
            toast.success("Programme saved");
            await onSaved();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to save programme");
          }
        }}
      >
        <div>
          <Label>Name of Training Program</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label>Local / Foreign</Label>
          <Select value={locationScope} onChange={(e) => setLocationScope(e.target.value as "LOCAL" | "FOREIGN")}>
            <option value="LOCAL">Local</option>
            <option value="FOREIGN">Foreign</option>
          </Select>
        </div>
        <div>
          <Label>Type of Training</Label>
          <Select value={trainingTypeId} onChange={(e) => setTrainingTypeId(e.target.value)} required>
            <option value="">Select</option>
            {lookups.data?.trainingTypes.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Institution</Label>
          <Select value={institutionId} onChange={(e) => { setInstitutionId(e.target.value); setInstitutionName(""); }}>
            <option value="">Select existing</option>
            {lookups.data?.institutions.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
          <Input className="mt-2" placeholder="Or type a new institution" value={institutionName} onChange={(e) => { setInstitutionName(e.target.value); if (e.target.value) setInstitutionId(""); }} />
        </div>
        <div>
          <Label>Venue</Label>
          <Input value={venue} onChange={(e) => setVenue(e.target.value)} required placeholder="City, hall, Zoom, Microsoft Teams…" />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
