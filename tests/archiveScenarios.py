"""Exercise the archive CLI against real temporary Git repos and a fake GitHub boundary."""
import contextlib
import importlib.util
import io
import pathlib
import subprocess
import sys
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('archive', sys.argv.pop(1))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ArchiveScenarios(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix='hark-archive-')
        module.ROOT = pathlib.Path(self.directory.name)
        self.git('init', '-b', 'codex/test')
        self.git('config', 'user.name', 'Test')
        self.git('config', 'user.email', 'test@example.com')
        self.git('remote', 'add', 'origin', 'https://github.com/example/hark.git')
        (module.ROOT / 'content.txt').write_text('baseline')
        self.git('add', 'content.txt'); self.git('commit', '-m', 'baseline')
        baseline = self.git('rev-parse', 'HEAD')
        (module.ROOT / 'content.txt').write_text('new content')
        self.git('add', 'content.txt'); self.git('commit', '-m', 'second')
        self.head = self.git('rev-parse', 'HEAD')
        self.refs = {'refs/heads/codex/test': baseline}
        self.mutations = []
        owner = self

        def fake_git(*args):
            if args[0] == 'ls-remote':
                return ''.join(f'{sha}\t{ref}\n' for ref, sha in owner.refs.items()).encode()
            owner.assertEqual(args[:3], ('push', '--atomic', 'origin'))
            owner.assertFalse(any('force' in arg for arg in args))
            for refspec in args[3:]:
                source, ref = refspec.split(':', 1)
                sha = owner.git('rev-parse', source)
                # Model an unchanged ref as a no-op to observe idempotence.
                if owner.refs.get(ref) != sha:
                    owner.refs[ref] = sha
                    owner.mutations.append(ref)
            return b''
        module.network_git = fake_git

    def tearDown(self):
        self.directory.cleanup()

    def git(self, *args):
        return subprocess.check_output(['git', *args], cwd=module.ROOT, stderr=subprocess.DEVNULL).decode().strip()

    def cli(self):
        previous = sys.argv
        try:
            sys.argv = ['archive', 'v0.1.7-dev-tools']
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                module.main()
        finally:
            sys.argv = previous

    def test_repeated_archive_and_resume_missing_tag(self):
        self.cli()
        tag = self.git('rev-parse', 'v0.1.7-dev-tools')
        self.assertEqual(self.refs, {'refs/heads/codex/test': self.head, 'refs/tags/v0.1.7-dev-tools': tag})
        count = len(self.mutations)
        self.cli()
        self.assertEqual(len(self.mutations), count)
        del self.refs['refs/tags/v0.1.7-dev-tools']
        self.cli()
        self.assertEqual(self.refs['refs/tags/v0.1.7-dev-tools'], tag)

    def test_different_remote_tag_stops_without_branch_mutation(self):
        self.refs['refs/tags/v0.1.7-dev-tools'] = 'f' * 40
        with self.assertRaises(SystemExit) as stopped:
            self.cli()
        self.assertEqual(stopped.exception.code, 1)
        self.assertEqual(self.mutations, [])

    def test_diverged_remote_stops_without_mutation(self):
        self.git('switch', '-c', 'other', 'HEAD~1')
        (module.ROOT / 'other.txt').write_text('other')
        self.git('add', 'other.txt'); self.git('commit', '-m', 'other')
        other = self.git('rev-parse', 'HEAD')
        self.git('switch', 'codex/test')
        self.refs['refs/heads/codex/test'] = other
        with self.assertRaises(SystemExit):
            self.cli()
        self.assertEqual(self.mutations, [])

    def test_private_file_in_clean_head_is_refused(self):
        (module.ROOT / '.env.local').write_text('FAKE=synthetic')
        self.git('add', '.env.local'); self.git('commit', '-m', 'private')
        with self.assertRaises(SystemExit):
            self.cli()
        self.assertEqual(self.mutations, [])

    def test_private_file_deleted_later_still_refuses_upload(self):
        (module.ROOT / '.env.local').write_text('FAKE=synthetic')
        self.git('add', '.env.local'); self.git('commit', '-m', 'private')
        self.git('rm', '.env.local'); self.git('commit', '-m', 'remove private')
        with self.assertRaises(SystemExit):
            self.cli()
        self.assertEqual(self.mutations, [])


if __name__ == '__main__':
    unittest.main()
