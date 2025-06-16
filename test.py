#!/usr/bin/env python3

import subprocess

cpu_output = subprocess.check_output(["sudo", "turbostat", "--Summary", "--quiet", "--show", "Avg_MHz,PkgTmp,PkgWatt", "--num_iterations", "1"], text=True)
def _parse_turbostat(output):
        """Parse turbostat output into structured data"""
        lines = output.strip().split('\n')
        if len(lines) < 2:
            return {"error": "Invalid turbostat output"}

        headers = lines[0].split()
        avg_data = lines[-1].split()  # Last line contains averages

        return {headers[i]: avg_data[i] for i in range(min(len(headers), len(avg_data)))}
print(_parse_turbostat(cpu_output))
