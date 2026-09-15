import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/api/user";
import { PageHeader, QueryState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { CompletionBadge, WorkflowBadge } from "@/components/StatusBadge";
import { deliveryLabel, formatDate, locationLabel } from "@/lib/format";

export function MyTrainingPage() {
  const query = useQuery({
    queryKey: ["my-training"],
    queryFn: () => userApi.participations({ pageSize: 50 }),
  });

  return (
    <div>
      <PageHeader
        title="My Training"
        description="Your participation records."
        actions={
          <Link to="/app/training/new">
            <Button>Add Training Record</Button>
          </Link>
        }
      />
      <Card>
        <CardContent className="pt-4">
          <QueryState
            isLoading={query.isLoading}
            error={query.error}
            empty={!query.data?.items.length}
            emptyMessage="You have not recorded any training yet."
          >
            <Table>
              <THead>
                <tr>
                  <Th>Name of the Training Program</Th>
                  <Th>Local / Foreign</Th>
                  <Th>Physical / Online</Th>
                  <Th>Type of Training</Th>
                  <Th>Institution</Th>
                  <Th>Venue</Th>
                  <Th>Participating as</Th>
                  <Th>From</Th>
                  <Th>To</Th>
                  <Th>Status of Completion</Th>
                  <Th>Workflow Status</Th>
                  <Th></Th>
                </tr>
              </THead>
              <tbody>
                {query.data?.items.map((item) => (
                  <tr key={item.id}>
                    <Td>{item.trainingProgram.name}</Td>
                    <Td>{locationLabel(item.trainingProgram.locationScope)}</Td>
                    <Td>{deliveryLabel(item.deliveryMode)}</Td>
                    <Td>{item.trainingProgram.trainingType.name}</Td>
                    <Td>{item.trainingProgram.institution.name}</Td>
                    <Td>{item.trainingProgram.venue}</Td>
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
                      <Link className="text-navy underline" to={`/app/training/${item.id}`}>
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
