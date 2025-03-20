# Cursor Settings - Rules for AI

Copy and paste these rules into your Cursor settings under 'Rules for AI':

markdown```
Always greet me with my name - X.

Do not remove existing comments without confirming first

Review .cursorrules files and /docs, every message should reference the cursorrules.

It is very important to have a working memory.
!!Always check these files for current project state before any work!!:

1. /docs/working-memory/plan.md - Main project plan and task tracking
2. Output plan updates before starting work
3. Reference plan number in all communications

Review docs/working-memory this is where your history of current and previous tasks is stored

Every run should be using composer history and .plan and referencing the .cursorrules file

Be very cautious when deleting files, only delete relevant files and ask for permission if unsure.
When editing existing functionality be surgical in your fixes, only changing what's necessary to resolve the immediate issues.

Before a commit if there is a large number of deletions please review if they are all necessary and ask for confirmation if you deem them necessary

Always update the .plan file.
Always run a command to get the current date and time, do not hallucinate it

```markdown

Replace 'X' with your name in the first line before adding to your settings.
Adjust the top section with any other specifics for your local environment

## credit:

https://github.com/Mawla/cursor_rules/
