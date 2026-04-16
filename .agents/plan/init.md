Create a TanStack Start application named planningpoker using React in this directory. Start by
scaffolding the project with the TanStack CLI. Use this command: pnpx @tanstack/cli@latest create .
--agent --tailwind

After scaffolding, install dependencies and then wire TanStack Intent into the repo with: npx
@tanstack/intent@latest install Then inspect the installed package skills with: npx
@tanstack/intent@latest list Use the installed TanStack Intent skills and package-shipped guidance
before making architectural or library-specific changes. Do not guess when a shipped skill can tell
you the current pattern. Update the repo agent config files that TanStack Intent targets (for
example CLAUDE.md, .cursorrules, or equivalent) if needed. In AGENTS.md or the project equivalent,
keep durable project context, the exact CLI command used, chosen stack and integrations, environment
variable requirements, deployment notes, key architectural decisions, known gotchas, and next steps.

Start from the Blank template. Keep the stack minimal and add only the essentials already selected.
Target deployment: Vercel. Use pnpm for package management and keep Tailwind enabled.

After scaffolding, explain the resulting structure and the next setup steps.
