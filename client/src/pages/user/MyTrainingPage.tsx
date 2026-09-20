import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/api/user";
import { PageHeader, QueryState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { CompletionBadge, WorkflowBadge } from "@/components/StatusBadge";
import { deliveryLabel, formatDate, locationLabel } from "@/lib/format";
import { searchParamsRecord } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => String(CURRENT_YEAR - i));

export function MyTrainingPage() {
  const [params, setParams] = useSearchParams();
  const year = params.get("year") ?? "";
  const workflowStatus = params.get("workflowStatus") ?? "";
  const locationScope = params.get("locationScope") ?? "";
  const deliveryMode = params.get("deliveryMode") ?? "";
  const search = params.get("search") ?? "";

  const query = useQuery({
    queryKey: ["my-training", params.toString()],
    queryFn: () =>
      userApi.participations({
        pageSize: 100,
        year: year || undefined,
        workflowStatus: workflowStatus || undefined,
        locationScope: locationScope || undefined,
        deliveryMode: deliveryMode || undefined,
        search: search || undefined,
      }),
  });

  function setFilter(key: string, value: string) {
    setParams({ ...searchParamsRecord(params), [key]: value, page: "1" });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Training"
        description="Filter your participation history by year, workflow, or programme."
        actions={
          <Link to="/app/training/new">
            <Button>Add Training Record</Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label>Year</Label>
            <Select value={year} onChange={(e) => setFilter("year", e.target.value)}>
              <option value="">All years</option>
              {YEAR_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Workflow</Label>
            <Select value={workflowStatus} onChange={(e) => setFilter("workflowStatus", e.target.value)}>
              <option value="">All</option>
              {["DRAFT", "SUBMITTED", "RETURNED", "APPROVED", "REJECTED"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Local / Foreign</Label>
            <Select value={locationScope} onChange={(e) => setFilter("locationScope", e.target.value)}>
              <option value="">All</option>
              <option value="LOCAL">Local</option>
              <option value="FOREIGN">Foreign</option>
            </Select>
          </div>
          <div>
            <Label>Mode</Label>
            <Select value={deliveryMode} onChange={(e) => setFilter("deliveryMode", e.target.value)}>
              <option value="">All</option>
              <option value="PHYSICAL">Physical</option>
              <option value="ONLINE">Online</option>
              <option value="HYBRID">Hybrid</option>
            </Select>
          </div>
          <div>
            <Label>Search</Label>
            <Input
              defaultValue={search}
              placeholder="Programme or institution"
              onBlur={(e) => setFilter("search", e.target.value.trim())}
              onKeyDown={(e) => {
                if (e.key === "Enter") setFilter("search", (e.target as HTMLInputElement).value.trim());
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <QueryState
            isLoading={query.isLoading}
            error={query.error}
            empty={!query.data?.items.length}
            emptyMessage="No training records match these filters."
          >
            <p className="mb-3 text-sm text-muted">
              {query.data?.total ?? 0} record{(query.data?.total ?? 0) === 1 ? "" : "s"}
              {year ? ` in ${year}` : ""}
            </p>
            <Table>
              <THead>
                <tr>
                  <Th>Programme</Th>
                  <Th>Local / Foreign</Th>
                  <Th>Mode</Th>
                  <Th>Type</Th>
                  <Th>Institution</Th>
                  <Th>Role</Th>
                  <Th>From</Th>
                  <Th>To</Th>
                  <Th>Completion</Th>
                  <Th>Workflow</Th>
                  <Th></Th>
                </tr>
              </THead>
              <tbody>
                {query.data?.items.map((item) => (
                  <tr key={item.id}>
                    <Td className="max-w-[240px] font-medium">
                      <span className="line-clamp-2">{item.trainingProgram.name}</span>
                    </Td>
                    <Td>{locationLabel(item.trainingProgram.locationScope)}</Td>
                    <Td>{deliveryLabel(item.deliveryMode)}</Td>
                    <Td>{item.trainingProgram.trainingType.name}</Td>
                    <Td>{item.trainingProgram.institution.name}</Td>
                    <Td>{item.participationRole.name}</Td>
                    <Td>{formatDate(item.fromDate)}</Td>
                    <Td>{formatDate(item.toDate)}</Td>
                    <Td>
                      <CompletionBadge status={item.completionStatus.name} />
                    </Td>
                    <Td>
                      <WorkflowBadge status={item.workflowStatus} />
                    </Td>
                    <Td>
                      <Link className="font-medium text-navy underline" to={`/app/training/${item.id}`}>
                        Open
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  );
}
