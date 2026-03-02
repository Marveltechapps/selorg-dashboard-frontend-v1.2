import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  MoreHorizontal,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { DocumentStatus, RiderDocument } from "./types";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DocumentApprovalTableProps {
  documents: RiderDocument[];
  loading: boolean;
  filterStatus: string;
  onFilterChange: (status: string) => void;
  onReview: (doc: RiderDocument) => void;
  onViewReason: (doc: RiderDocument) => void;
}

export function DocumentApprovalTable({
  documents,
  loading,
  filterStatus,
  onFilterChange,
  onReview,
  onViewReason,
}: DocumentApprovalTableProps) {
  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "approved":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "rejected":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "expired":
        return "bg-orange-100 text-orange-800 hover:bg-orange-100";
      case "resubmitted":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="font-bold text-[#212121]">Document Approval Queue</h3>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500">Filter:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Filter size={14} />
                {filterStatus === "all" ? "All Statuses" : getStatusLabel(filterStatus)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onFilterChange("all")}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFilterChange("pending")}>Pending</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFilterChange("approved")}>Approved</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFilterChange("rejected")}>Rejected</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFilterChange("resubmitted")}>Resubmitted</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFilterChange("expired")}>Expired</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#F5F7FA]">
            <TableRow>
              <TableHead className="w-[200px]">Rider Name</TableHead>
              <TableHead>Document Type</TableHead>
              <TableHead>Submission Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></TableCell>
                  <TableCell><div className="h-6 bg-gray-200 rounded-full w-24 animate-pulse"></div></TableCell>
                  <TableCell className="text-right"><div className="h-8 bg-gray-200 rounded w-16 ml-auto animate-pulse"></div></TableCell>
                </TableRow>
              ))
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-gray-500">
                  No documents found.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-[#FAFAFA]">
                  <TableCell className="font-medium text-[#212121]">
                    {doc.riderName}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-[#757575]" />
                      {doc.documentType}
                    </div>
                  </TableCell>
                  <TableCell className="text-[#616161]">
                    {format(new Date(doc.submittedAt), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getStatusColor(doc.status)}>
                      {getStatusLabel(doc.status).replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {doc.status === "pending" || doc.status === "resubmitted" ? (
                      <Button
                        variant="ghost"
                        className="text-[#F97316] hover:text-[#EA580C] hover:bg-orange-50 h-8 px-3 text-xs font-medium"
                        onClick={() => onReview(doc)}
                      >
                        Review
                      </Button>
                    ) : doc.status === "rejected" ? (
                      <Button
                        variant="ghost"
                        className="text-[#757575] hover:text-[#212121] h-8 px-3 text-xs font-medium"
                        onClick={() => onViewReason(doc)}
                      >
                        View Reason
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        className="text-[#757575] hover:text-[#212121] h-8 px-3 text-xs font-medium"
                        onClick={() => onReview(doc)}
                      >
                        Details
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Simple pagination mock */}
      <div className="p-4 border-t border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center text-xs text-gray-500">
        <span>Showing {documents.length} results</span>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled>Previous</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">Next</Button>
        </div>
      </div>
    </div>
  );
}
