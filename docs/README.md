# Project Documentation

Updated: 2024-03-21 21:22

This directory contains all project documentation, planning materials, and working memory for development tasks. This README outlines how to create, propose, and execute plans for new features or improvements using this /docs/ directory structure with an AI agent.

## Cursor setup

Copy the section of `cursor_setting.md` into your cursor settings User Rules section and customize as needed

NOTE: to prevent cursor IDE from changing or possibly disabling triggers of rules, update your user settings .json file with this to disable the built in mdc editor:
JSON Configuration:

```json
    "workbench.editorAssociations": {
        "*.mdc": "default"
    }
```

After disabling the editer, add the following rule files to the .cursor/rules directory:
- 010-docs-memory-knowledge-management.mdc
- 011-docs-plan-management.mdc

> 
> #### Deprecation Notice ⚠️
> 
> Copy and rename the `.cursorrules.example` into the root directory as `.cursorrules`.  customize as needed
>
>  `.cursorrules` are deprecated and will be removed soon.  Use the .cursor/rules files outlined above.


## Project Setup

update the `docs/project-context.md` with specifics for this project for things like directory structure, key frameworks and depenedencies, and best practices.

Shell Command:

```shell
Can you ensure the @/docs/project-context.md file matches the project structure, and highlights key frameworks, dependencies and best practices for this project

@package.json
@/docs/
```

ask the Agent to check the /docs folder to the Docs Dir Structure below, and create any missing folders

Shell Command:

```shell
Can you ensure the /docs folder directory matches the structure outlined in the @/docs/README.md file

@/docs/
```

## Docs Directory Structure

```plaintext
/docs/
   ├── working-memory/           # Active context
   │   ├── open/                 # Active tasks
   │   │   └── {task-id}/        # Task-specific directory
   │   │       └── .plan         # Task plan
   │   ├── done/                 # Completed tasks
   |   └── plan.md               # tracks all open and completed plans
   ├── templates/                # Project templates
   │   └── features/              # Feature documentation templates
   │       ├── README.md
   │       ├── api.md
   │       ├── architecture.md
   │       ├── components.md
   │       └── testing.md
   ├── features/                 # Project features
   ├── project-context.md        # Project Context, project folder structure, key dependencies and 
   ├── .cursorrules.example      # cursorrules example file
   ├── cursor_settings.md        # Cursor IDE settings
   └── README.md                 # This file
```

## Quickly Adding Future Tasks

To quickly add tasks to the Future Tasks section in plan.md, use these prompts:

1. **Add a single future task**:

   ```shell
   Add a new future task to plan.md:
   Name: [Task Name]
   Description: [Brief description of the task]
   Priority: [High/Medium/Low]
   Estimated Effort: [Time estimate]
   ```

2. **Add multiple future tasks at once**:

   ```shell
   Add the following future tasks to plan.md:
   
   Task 1:
   - Name: [Task Name]
   - Description: [Brief description]
   - Priority: [High/Medium/Low]
   - Effort: [Time estimate]
   
   Task 2:
   - Name: [Task Name]
   - Description: [Brief description]
   - Priority: [High/Medium/Low]
   - Effort: [Time estimate]
   ```

### Tips for Managing Future Tasks

1. **Use consistent priorities**: Stick to High, Medium, and Low for easier sorting
2. **Include realistic effort estimates**: Use consistent units (days/weeks)
3. **Regularly review and update**: Keep the Future Tasks section current
4. **Add technical details**: Include enough information to start work later

## Managing Task Milestones

To add or update milestones for active tasks in plan.md, use these prompts:

1. **Add a new milestone to an existing task**:

   ```shell
   Add a new milestone to the "[Task Name]" task in plan.md:
   Milestone: [Milestone Name]
   Description: [Brief description]
   Dependencies: [Any dependencies or prerequisites]
   ```

   ```shell
   Add a new milestone to the "[Task Name]" task in plan.md:
   [Milestone Name]
   clarify anything needed
   ```

2. **Add multiple milestones**:

   ```shell
   Add the following milestones to the "[Task Name]" task:

   Milestone 1:
   - Name: [Milestone Name]
   - Description: [Brief description]
   - Dependencies: [List any dependencies]

   Milestone 2:
   - Name: [Milestone Name]
   - Description: [Brief description]
   - Dependencies: [List any dependencies]
   ```

3. **Update milestone status**:

   ```shell
   Update the status of milestone "[Milestone Name]" in the "[Task Name]" task:
   Status: [X] Completed
   Progress: [Add any relevant progress notes]
   ```

4. **Reorder milestones**:

   ```shell
   Reorder the milestones in "[Task Name]" task to match this sequence:
   1. [First Milestone]
   2. [Second Milestone]
   3. [Third Milestone]
   ```

### Tips for Managing Milestones

1. **Clear Dependencies**:
   - List any prerequisites for each milestone
   - Note dependencies on other tasks or milestones
   - Include external dependencies

2. **Progress Tracking**:
   - Use [X] for completed milestones
   - Keep descriptions concise but clear
   - Update progress notes regularly

3. **Logical Ordering**:
   - Order milestones by dependency chain
   - Group related milestones together
   - Consider critical path items

4. **Regular Reviews**:
   - Review milestone progress weekly
   - Update status and notes promptly
   - Adjust timelines as needed

## Creating New Plans

To create a new plan using the AI assistant, follow these prompts:

1. **Create a plan from a future task**:

   ```shell
   Create a full task plan for the future task "[Task Name]" from plan.md.
   Expand it into a complete implementation plan with:
   - Detailed problem analysis based on the task description
   - Multiple solution design options
   - Step-by-step implementation approach
   - Required components and dependencies
   - Ask me clarifying questions when needed to provide the ideal solution for my constraints
   ```

2. **Request a new plan**:

   ```shell
   Create a new task plan for [feature/bugfix description]. 
   The plan should include:
   - Problem analysis
   - Solution design options
   - Implementation steps
   ```

3. **Request with specific requirements**:

   ```shell
   Create a new task plan for [feature/bugfix description].
   It should address these requirements:
   - [Requirement 1]
   - [Requirement 2]
   - [Requirement 3]
   ```

4. **Request with dependencies**:

   ```shell
   Create a new task plan for [feature/bugfix description] 
   that builds on the work done in [previous task].
   ```

For best results, add clear requirements to the prompts and refine the plan.  Even better, working with the Agent in `Ask` mode to refine the plan before letting the `Agent` write files.

## Executing Plans

Here are comprehensive examples of prompts to use with the AI assistant for executing plans:

1. **Starting a plan execution**:

   ```shell
   Start executing the plan for [task-name]. Begin with step 1 and update the 
   progress in the plan file. Check the current status and update it with 
   today's date and "In Progress" status.
   ```

2. **Executing a specific step**:

   ```shell
   Execute step 2 from the [task-name] plan. Specifically, implement the 
   [specific feature] according to the approach selected in the Solution Design. 
   Update the progress history after completion.
   ```

3. **Continuing from a previous point**:

   ```shell
   Continue executing the [task-name] plan from step 3. The previous steps 
   were completed as noted in the progress history. Update the current status 
   as you make progress.
   ```

4. **Implementing a specific component**:

   ```shell
   Implement the [component-name] component as described in step 2.3 of the 
   [task-name] plan. Use the approach outlined in Solution Design and ensure 
   it follows the project's code standards.
   ```

5. **Troubleshooting implementation issues**:

   ```shell
   While implementing step 3 of the [task-name] plan, I'm encountering 
   [specific issue]. Help resolve this issue and update the plan's progress 
   history with the solution.
   ```

6. **Adding tests for implemented features**:

   ```shell
   Create tests for the features implemented in step 2 of the [task-name] plan. 
   Follow the testing approach outlined in the plan and update the progress 
   history with the test coverage achieved.
   ```

7. **Reviewing and improving implementation**:

   ```shell
   Review the code implemented for step 4 of the [task-name] plan. 
   Suggest improvements for performance and maintainability, then 
   implement the approved changes.
   ```

8. **Detailed step execution with documentation**:

   ```shell
   Execute step 3.2 of the [task-name] plan with a focus on thorough 
   documentation. Create the necessary component and update both the 
   code documentation and the corresponding feature documentation in /docs/features.
   ```

9. **Testing specific implementation**:

   ```shell
   I've completed step 2 of the [task-name] plan. Now help me test this 
   implementation against the success criteria defined in the plan. Update 
   the plan with test results and any issues found.
   ```

10. **Status update request**:

    ```shell
    Provide a status update for the [task-name] plan. Review what's been 
    completed, what's in progress, any blocking issues, and what comes next. 
    Then update the Current Status section with this information.
    ```

### Tips for Effective Plan Execution

1. **Check plan status first**:
   - Always check the current status and progress history before starting work
   - Reference completed steps and decisions previously made

2. **Be specific with task references**:
   - Reference specific step numbers (e.g., "step 2.3")
   - Mention related components or files
   - Link to existing documentation or previous tasks

3. **Request formatted updates**:
   - Ask for updates using the proper formatting conventions
   - Request timestamps to be updated using the system date command
   - Ensure progress history includes all required emoji markers

4. **Incremental progress**:
   - Focus on one step or sub-step at a time
   - Request status updates after significant progress
   - Break complex steps into smaller actionable tasks

## Completing Plans

Here are comprehensive examples of prompts to use with the AI assistant for completing plans:

1. **Final implementation verification**:

   ```shell
   Verify that all steps in the [task-name] plan are completed. Check each item 
   in the Implementation Steps section, review functionality against success 
   criteria, and prepare a final summary of accomplishments.
   ```

2. **Completing the final step**:

   ```shell
   Complete the final step of the [task-name] plan. Once implemented, mark
   the plan as completed, update the Current Status to "Completed", and add
   a final progress history entry with today's date.
   ```

3. **Final documentation update**:

   ```shell
   The implementation for [task-name] is complete. Update all documentation
   including component docs, API references, and prepare a final progress
   history entry summarizing key achievements and decisions.
   ```

4. **Plan completion with testing**:

   ```shell
   Run final tests for the [task-name] implementation. If all tests pass,
   mark the plan as completed, add a comprehensive progress history entry,
   and prepare to move the task to the done directory.
   ```

5. **Moving to completed tasks**:

   ```shell
   The [task-name] plan is now fully implemented and tested. Update the plan.md
   file by moving this task from Active Tasks to Completed Tasks with today's
   date, a brief description, and key achievements.
   ```

6. **Final review and completion**:

   ```shell
   Perform a final review of the [task-name] implementation. Check code quality,
   test coverage, and documentation completeness. Then mark the plan as
   completed and summarize achievements in a final progress entry.
   ```

7. **Task directory relocation**:

   ```shell
   The [task-name] plan is complete. Help me move the task directory from
   docs/working-memory/open to docs/working-memory/done and update the
   corresponding references in plan.md.
   ```

   ```shell
   The [task-name] plan is stale. Help me move the task directory from
   docs/working-memory/open to docs/working-memory/archive and update the
   corresponding references in plan.md.
   ```

8. **Comprehensive completion summary**:

   ```shell
   Generate a comprehensive completion summary for the [task-name] plan.
   Include what was implemented, key decisions made, challenges overcome,
   and documentation updates. Use this to create the final progress entry
   and update plan.md.
   ```

## Plan Maintenance

For maintaining the overall project plan:

1. Review plan.md regularly to track progress
2. Archive completed tasks older than 30 days

   PowerShell Script:

   ```powershell
   # Archive tasks older than 30 days (example)
   $cutoffDate = (Get-Date).AddDays(-30)
   $oldTasks = Get-ChildItem -Path "docs/working-memory/done" -Directory | Where-Object { $_.LastWriteTime -lt $cutoffDate }
   foreach ($task in $oldTasks) {
       # Archive task (example implementation)
       $archivePath = "docs/working-memory/archive/" + $task.Name
       New-Item -Path $archivePath -ItemType Directory -Force
       Copy-Item -Path $task.FullName -Destination $archivePath -Recurse
       Remove-Item -Path $task.FullName -Recurse -Force
   }
   ```

   Bash Script:

   ```bash
   # Archive tasks older than 30 days (example)
   mkdir -p docs/working-memory/archive
   find docs/working-memory/done -type d -name "[!.]*" -mtime +30 | while read dir; do
       taskName=$(basename "$dir")
       mkdir -p "docs/working-memory/archive/$taskName"
       cp -R "$dir"/* "docs/working-memory/archive/$taskName/"
       rm -rf "$dir"
   done
   ```

3. Update future tasks as priorities change
4. Add new tasks to the plan.md file as they're identified

## Getting Current Date and Time

For timestamps in documentation:

PowerShell Commands:

```powershell
Get-Date -Format "yyyy-MM-dd HH:mm"
echo (Get-Date -Format "yyyy-MM-dd HH:mm")
```

Bash Command:

```bash
date "+%Y-%m-%d %H:%M"
```

## credit and resources

https://github.com/Mawla/cursor_rules/
