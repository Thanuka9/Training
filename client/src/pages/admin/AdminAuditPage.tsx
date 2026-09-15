import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/api/admin";
import { PageHeader, QueryState } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

export function AdminAuditPage() {
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["audit", search],
    queryFn: () => adminApi.audit({ search, pageSize: 50 }),
  });

  return (
    <div>
      <PageHeader title="Audit log" description="Trace administrative and data changes." />
      <Card className="mb-4">
        <CardContent className="pt-4">
          <Input placeholder="Search action, officer or entity" value={search} onChange={(e) => setSearch(e.target.value)} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <QueryState isLoading={query.isLoading} error={query.error} empty={!query.data?.items.length}>
            <Table>
              <THead>
                <tr>
                  <Th>When</Th>
                  <Th>Actor</Th>
                  <Th>Action</Th>
                  <Th>Entity</Th>
                  <Th>IP</Th>
                </tr>
              </THead>
              <tbody>
                {query.data?.items.map((item) => (
                  <tr key={String(item.id)}>
                    <Td>{formatDateTime(String(item.createdAt))}</Td>
                    <Td>{(item.actor as { fullName?: string; bankId?: string } | null)?.fullName ?? "System"}</Td>
                    <Td>{String(item.action)}</Td>
                    <Td>{String(item.entityType)} {String(item.entityId).slice(0, 8)}</Td>
                    <Td>{String(item.ipAddress ?? "—")}</Td>
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
