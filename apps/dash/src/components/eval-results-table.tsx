'use client';

import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnDef,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EvalResult, EvalScore } from '@repo/db';

interface EvalResultsTableProps {
  results: EvalResult[];
}

export function EvalResultsTable({ results }: EvalResultsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  // Extract unique scorer names from all results
  const scorerNames = useMemo(() => {
    const names = new Set<string>();
    results.forEach((result) => {
      if (result.scores && Array.isArray(result.scores)) {
        result.scores.forEach((score: EvalScore) => {
          names.add(score.name);
        });
      }
    });
    return Array.from(names).sort();
  }, [results]);

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getScoreValue = (
    result: EvalResult,
    scorerName: string,
  ): number | null => {
    if (!result.scores || !Array.isArray(result.scores)) return null;

    const score = result.scores.find((s: EvalScore) => s.name === scorerName);
    if (!score) return null;

    return typeof score.value === 'number' ? score.value : null;
  };

  const getScoreDisplay = (result: EvalResult, scorerName: string): string => {
    const value = getScoreValue(result, scorerName);
    return value !== null ? value.toFixed(3) : '-';
  };

  const getTags = (result: EvalResult): string[] => {
    // Check if tags are stored in metadata
    if (
      result.metadata &&
      typeof result.metadata === 'object' &&
      'tags' in result.metadata
    ) {
      const tags = result.metadata.tags;
      if (Array.isArray(tags)) {
        return tags.map((tag) => String(tag));
      }
    }
    return [];
  };

  // Define columns
  const columns = useMemo<ColumnDef<EvalResult>[]>(() => {
    const baseColumns: ColumnDef<EvalResult>[] = [
      {
        accessorKey: 'itemIndex',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === 'asc')
              }
              className="h-auto p-0 font-medium"
            >
              #
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-1 h-3 w-3" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-1 h-3 w-3" />
              ) : (
                <ArrowUpDown className="ml-1 h-3 w-3" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue('itemIndex')}</div>
        ),
        size: 50,
      },
      {
        accessorKey: 'input',
        header: 'Input',
        cell: ({ row }) => (
          <pre className="text-xs whitespace-pre-wrap overflow-hidden max-w-[200px]">
            {formatValue(row.getValue('input'))}
          </pre>
        ),
        sortingFn: (rowA, rowB) => {
          const a = formatValue(rowA.getValue('input'));
          const b = formatValue(rowB.getValue('input'));
          return a.localeCompare(b);
        },
      },
      {
        accessorKey: 'output',
        header: 'Output',
        cell: ({ row }) => (
          <pre className="text-xs whitespace-pre-wrap overflow-hidden max-w-[200px]">
            {formatValue(row.getValue('output'))}
          </pre>
        ),
        sortingFn: (rowA, rowB) => {
          const a = formatValue(rowA.getValue('output'));
          const b = formatValue(rowB.getValue('output'));
          return a.localeCompare(b);
        },
      },
      {
        accessorKey: 'expected',
        header: 'Expected',
        cell: ({ row }) => (
          <pre className="text-xs whitespace-pre-wrap overflow-hidden max-w-[200px]">
            {formatValue(row.getValue('expected'))}
          </pre>
        ),
        sortingFn: (rowA, rowB) => {
          const a = formatValue(rowA.getValue('expected'));
          const b = formatValue(rowB.getValue('expected'));
          return a.localeCompare(b);
        },
      },
      {
        id: 'tags',
        accessorFn: (row) => getTags(row).join(','),
        header: 'Tags',
        cell: ({ row }) => {
          const tags = getTags(row.original);
          return tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            '-'
          );
        },
      },
    ];

    // Add dynamic scorer columns
    const scorerColumns: ColumnDef<EvalResult>[] = scorerNames.map(
      (scorerName) => ({
        id: `scorer_${scorerName}`,
        accessorFn: (row) => getScoreValue(row, scorerName),
        header: ({ column }) => {
          return (
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() =>
                  column.toggleSorting(column.getIsSorted() === 'asc')
                }
                className="h-auto p-0 font-medium"
              >
                {scorerName}
                {column.getIsSorted() === 'asc' ? (
                  <ArrowUp className="ml-1 h-3 w-3" />
                ) : column.getIsSorted() === 'desc' ? (
                  <ArrowDown className="ml-1 h-3 w-3" />
                ) : (
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                )}
              </Button>
            </div>
          );
        },
        cell: ({ row }) => (
          <div className="text-center">
            {getScoreDisplay(row.original, scorerName)}
          </div>
        ),
        sortingFn: (rowA, rowB) => {
          const scoreA = getScoreValue(rowA.original, scorerName);
          const scoreB = getScoreValue(rowB.original, scorerName);

          // Handle null values - put them at the end
          if (scoreA === null && scoreB === null) return 0;
          if (scoreA === null) return 1;
          if (scoreB === null) return -1;

          return scoreA - scoreB;
        },
      }),
    );

    return [...baseColumns, ...scorerColumns];
  }, [scorerNames, results]);

  const table = useReactTable({
    data: results,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No results found for this evaluation run.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{
                        width: header.column.getSize(),
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
