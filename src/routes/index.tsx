import { createFileRoute } from '@tanstack/react-router'
import { MinimalTable } from '#/demo/MinimalTable'
import { ProjectsTable } from '#/demo/ProjectsTable'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="flex flex-col gap-8 p-8">
      <section>
        <h1 className="mb-4 text-2xl font-bold">DataTable demo</h1>
        <ProjectsTable />
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold">Minimal (no features)</h2>
        <MinimalTable />
      </section>
    </div>
  )
}
