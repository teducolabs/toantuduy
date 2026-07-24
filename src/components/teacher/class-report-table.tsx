'use client'

import { Fragment, useState } from 'react'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { nextSortState, sortRows, type SortKey, type SortState } from '@/components/teacher/class-report-sort'
import type { ClassReport } from '@/domain/use-cases/class-report'
import { reports } from '@/locales/vi/reports'
import { skillDisplayName } from '@/locales/vi/skills'

function isActiveKey(sortState: SortState, key: SortKey): boolean {
  if (!sortState) return false
  if (sortState.key === 'completion' || key === 'completion') return sortState.key === key
  return sortState.key.skillId === key.skillId
}

// D1/AC #5: this table renders per-Skill accuracy cells per student, but NEVER
// a per-student session total or score — no such value exists in its props.
export function ClassReportTable({ report }: { report: ClassReport }) {
  const [sortState, setSortState] = useState<SortState>(null)

  const sortedRows = sortRows(report.rows, sortState)

  // aria-sort lives on the <th> (only on the active column); the button gives
  // a Tab-reachable, Enter-activatable target ≥ 44px tall (UX-DR17/19).
  function sortableHeader(key: SortKey, label: string) {
    const active = isActiveKey(sortState, key)
    const ascending = active && sortState!.direction === 'asc'
    return (
      <th
        scope="col"
        aria-sort={active ? (ascending ? 'ascending' : 'descending') : undefined}
        className="sticky top-0 bg-background px-3 py-2 text-left font-semibold"
      >
        <button
          type="button"
          onClick={() => setSortState(nextSortState(sortState, key))}
          className="flex min-h-11 items-center gap-1 text-left"
        >
          {label}
          {active &&
            (ascending ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            ))}
        </button>
      </th>
    )
  }

  return (
    <div data-slot="class-report-table" className="overflow-auto border border-gray-200 rounded-brand-md">
      {report.rows.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">{reports.noStudents}</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th scope="col" className="sticky top-0 bg-background px-3 py-2 text-left font-semibold">
              <span className="flex min-h-11 items-center">{reports.studentColumnLabel}</span>
            </th>
            {sortableHeader('completion', reports.completionColumnLabel)}
            {report.skills.map((skill) => (
              <Fragment key={skill.id}>{sortableHeader({ skillId: skill.id }, skillDisplayName(skill.code, skill.name))}</Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.childProfileId} className="border-b border-gray-200">
              <th scope="row" className="min-h-11 px-3 py-3 text-left font-medium">
                {row.name}
              </th>
              <td className="px-3 py-3">
                {row.completed ? (
                  <>
                    <Check className="size-4 text-feedback-correct" aria-hidden="true" />
                    <span className="sr-only">{reports.completedSrLabel}</span>
                  </>
                ) : (
                  reports.notCompletedCell
                )}
              </td>
              {report.skills.map((skill) => {
                const accuracy = row.accuracyBySkillId?.[skill.id]
                return (
                  <td key={skill.id} className="px-3 py-3">
                    {accuracy === undefined ? reports.notCompletedCell : reports.formatPercent(accuracy)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/50 font-semibold">
            <th scope="row" className="px-3 py-3 text-left">
              {reports.classAverageLabel}
            </th>
            {report.classAverage === null ? (
              <td colSpan={report.skills.length + 1} className="px-3 py-3 text-muted-foreground">
                {reports.noDataCell}
              </td>
            ) : (
              <>
                <td className="px-3 py-3" />
                {report.skills.map((skill) => {
                  const average = report.classAverage![skill.id]
                  return (
                    <td key={skill.id} className="px-3 py-3">
                      {average === undefined ? reports.notCompletedCell : reports.formatPercent(average)}
                    </td>
                  )
                })}
              </>
            )}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
