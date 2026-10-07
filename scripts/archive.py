"""Archive reviewed staged changes or HEAD with an atomic, verified Git push."""
import argparse
import json
import pathlib
import re
import subprocess
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def network_git(*args):
    command = ["git", "-c", "http.version=HTTP/1.1"]
    # urllib reads macOS system proxies; Git does not read them itself.
    proxy = urllib.request.getproxies().get("https")
    if proxy:
        command += ["-c", "http.proxy=" + proxy]
    try:
        result = subprocess.run(command + list(args), cwd=ROOT, capture_output=True, timeout=60)
    except subprocess.TimeoutExpired:
        raise ValueError("Git remote operation timed out; rerun the same archive command to resume.") from None
    if result.returncode:
        raise ValueError("Git remote operation failed; check GitHub authentication, system proxy and remote refs, then rerun.")
    return result.stdout


def public_paths(raw):
    for path in raw.decode().split("\0"):
        file = pathlib.PurePosixPath(path)
        name = file.name.lower()
        if (name == ".env" or (name.startswith(".env.") and name != ".env.example")
                or file.suffix.lower() in {".db", ".sqlite", ".sqlite3", ".pem", ".key", ".p12", ".pfx"}
                or any(part in {".local", ".cache", ".next", "node_modules", "deploy", "__pycache__"} for part in file.parts)):
            raise ValueError("Environment, private data, keys, databases or generated files cannot be archived: " + path)


def preflight(version):
    if not re.fullmatch(r"v\d+\.\d+\.\d+(?:-[a-z0-9-]+)?", version):
        raise ValueError("Use a version such as v0.1.7-dev-tools.")
    branch = git("branch", "--show-current").decode().strip()
    if not branch.startswith("codex/"):
        raise ValueError("Archive requires an attached codex/ branch.")
    remote = git("remote", "get-url", "origin").decode().strip()
    match = re.fullmatch(r"(?:https://github\.com/|git@github\.com:)([\w.-]+/[\w.-]+?)(?:\.git)?", remote)
    if not match:
        raise ValueError("Origin must identify a GitHub repository.")
    if git("diff", "--name-only"):
        raise ValueError("Stage reviewed changes first; unstaged changes remain.")
    if git("ls-files", "--others", "--exclude-standard"):
        raise ValueError("Review and stage untracked files before archiving.")
    git("diff", "--cached", "--check")
    public_paths(git("diff", "--cached", "--name-only", "-z"))
    public_paths(git("ls-tree", "-r", "--name-only", "-z", "HEAD"))
    return branch, match.group(1)


def refs(branch, version):
    return {ref: sha for sha, ref in (line.split() for line in network_git(
        "ls-remote", "origin", "refs/heads/" + branch, "refs/tags/" + version,
    ).decode().splitlines())}


def archive(version, message, dry_run=False):
    branch, repo = preflight(version)
    if dry_run:
        print(json.dumps({"dryRun": True, "branch": branch, "repo": repo, "version": version}))
        return
    remote_refs = refs(branch, version)
    branch_ref, tag_ref = "refs/heads/" + branch, "refs/tags/" + version
    remote_head = remote_refs.get(branch_ref)
    if remote_head is None:
        raise ValueError("Push the branch's baseline before using this archive command.")
    if subprocess.run(["git", "merge-base", "--is-ancestor", remote_head, "HEAD"], cwd=ROOT, capture_output=True).returncode != 0:
        raise ValueError("Remote branch diverged or is ahead; it will not be overwritten.")
    # Check intermediate commits too: a later deletion does not erase private Git history.
    for commit in git("rev-list", remote_head + "..HEAD").decode().splitlines():
        public_paths(git("ls-tree", "-r", "--name-only", "-z", commit))
    if git("diff", "--cached", "--name-only"):
        if not message:
            raise ValueError("Provide a commit message for reviewed staged changes.")
        git("commit", "-m", message)
    head = git("rev-parse", "HEAD").decode().strip()
    existing = subprocess.run(["git", "rev-parse", "--verify", tag_ref], cwd=ROOT, capture_output=True)
    if existing.returncode == 0:
        if git("cat-file", "-t", version).decode().strip() != "tag" or git("rev-parse", version + "^{}").decode().strip() != head:
            raise ValueError("Existing local tag differs; it will not be replaced.")
    else:
        git("tag", "-a", version, "-m", message or f"Hark {version}")
    tag_sha = git("rev-parse", version).decode().strip()
    if remote_refs.get(tag_ref) not in {None, tag_sha}:
        raise ValueError("Remote tag differs; it will not be replaced.")
    print("Pushing branch and annotated tag atomically...", flush=True)
    network_git("push", "--atomic", "origin", "HEAD:" + branch_ref, tag_ref + ":" + tag_ref)
    verified = refs(branch, version)
    if verified.get(branch_ref) != head or verified.get(tag_ref) != tag_sha:
        raise ValueError("Remote archive verification failed.")
    git("update-ref", "refs/remotes/origin/" + branch, head)
    print(json.dumps({"archived": version, "commit": head, "tag": tag_sha, "repo": repo, "verified": True}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("version")
    parser.add_argument("message", nargs="?")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        archive(args.version, args.message, args.dry_run)
    except (ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"Archive stopped: {error}\n")


if __name__ == "__main__":
    main()
