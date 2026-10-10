"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { enqueueJob, lastRunJob } from "@/jobs/enqueue";
import { dispatchJob } from "@/jobs/dispatch";
import { kickScheduler } from "@/jobs/scheduler";
import { errorMessage, failure } from "@/lib/actionResult";
import { requireLocalUser } from "@/lib/auth";
import { createProject, projectForUser } from "@/lib/projects";

export type NewProjectState = { error: string | null; projectId?: string };

const FALLBACK = "Something went wrong.";

/**
 * The name the project carries until the page read names it: the host, less
 * its "www.", so a broken read still leaves a project the switcher can show.
 */
function nameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Creates the project and hands everything else to a job, then opens the leads
 * page, where the work is drawn as it happens. Nothing is read inside the
 * request: the page read alone held the form for 28 seconds, and the profile it
 * produced is not what a person who just pasted a URL came to look at.
 */
export async function createProjectAndProfileAction(
  previous: NewProjectState,
  formData: FormData,
): Promise<NewProjectState> {
  const user = await requireLocalUser();
  const url = String(formData.get("url") ?? "").trim();
  if (!url) {
    return { error: "A product URL is needed before we can read your site." };
  }
  // The field is plain text with the scheme drawn beside it, so the browser
  // no longer refuses an address that is not one.
  if (!URL.canParse(url) || !new URL(url).hostname.includes(".")) {
    return { error: "That does not look like a web address. Try something like yourproduct.com." };
  }
  const name = nameFromUrl(url);

  let projectId: string;
  try {
    const existing = previous.projectId ? await projectForUser(user.id, previous.projectId) : null;
    if (previous.projectId && !existing) {
      return { error: "That project is not yours." };
    }
    const project = existing?.url === url ? existing : await createProject(user.id, name, url);
    if (!project) {
      return { error: "The project could not be created." };
    }
    projectId = project.id;
  } catch (error) {
    return failure(error, FALLBACK);
  }

  try {
    const setup = await lastRunJob("discovery_initial", projectId);
    await dispatchJob(setup ?? await enqueueJob("discovery_initial", projectId));
    kickScheduler();
  } catch (error) {
    return { projectId, error: `${name} was created but its setup could not be started: ${errorMessage(error, FALLBACK)} Retry to continue this project.` };
  }

  revalidatePath("/app", "layout");
  redirect(`/app/leads?project=${projectId}`);
}
