import { createClient } from "@/lib/supabase/server";
import { Shield } from "lucide-react";
import AuditTable from "./audit-table";
import type { AuditLog } from "@/types";

export default async function AuditoriaPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Auditoria</h1>
            <p className="text-gray-500 text-sm mt-1">
              Registro de cambios y actividad del sistema
            </p>
          </div>
        </div>
      </div>

      <AuditTable logs={(logs as AuditLog[]) || []} />
    </div>
  );
}
