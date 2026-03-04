# MasterApi.py
import subprocess
import os
import sys

# List of API scripts to run (relative paths)
apis = [
    "Cv_Screen/API.py",
    "Dynamic_Interview/api.py",
    "Employee_Retention/API.py",
    "Performance_Productivity/Api.py"
]

# Store processes
processes = []

try:
    for api_path in apis:
        # Make sure the file exists
        if not os.path.exists(api_path):
            print(f"File not found: {api_path}")
            continue
        
        # Run the script in a new process
        print(f"Starting {api_path} ...")
        proc = subprocess.Popen([sys.executable, api_path])
        processes.append(proc)

    print("All APIs started. Press Ctrl+C to stop.")

    # Keep the master script running while child processes run
    for proc in processes:
        proc.wait()

except KeyboardInterrupt:
    print("\nStopping all APIs...")
    # Terminate all child processes
    for proc in processes:
        proc.terminate()
    print("All APIs stopped.")