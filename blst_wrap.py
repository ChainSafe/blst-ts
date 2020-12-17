import sys
import subprocess
import re
import shutil
import os.path

pythonScript = sys.argv[0]
sourceSwgFile = sys.argv[1]
targetCppFile = sys.argv[2]
print("sourceSwgFile", sourceSwgFile)
print("targetCppFile", targetCppFile)


if os.path.isfile(targetCppFile):
    print("targetCppFile already exists, skipping build")
    sys.exit(0)
else:
    print("targetCppFile not found, building")

here = re.split(r'[/\\](?=[^/\\]*$)', sys.argv[0])
if len(here) == 1:
    here.insert(0, '.')

try:
    version = subprocess.check_output(["swig", "-version"]).decode('ascii')
    print(version)
    v = re.search(r'SWIG Version ([0-9]+)', version)
    if v and int(v.group(1)) >= 4:
        print("Running SWIG...")
        subprocess.check_call(["swig", "-c++", "-javascript",
                                       "-node", "-DV8_VERSION=0x060000",
                                       "-o", targetCppFile, sourceSwgFile])
    else:
        print("Unsupported swig version")
        sys.exit(202)
    
except OSError as e:
    if e.errno == 2:    # "no such file or directory"
        print("SWIG not installed", e)
    else:
        print("Error checking SWIG version", e)
    sys.exit(e.errno)

nodeVersion = subprocess.check_output(["node", "--version"]).decode('ascii')
nodeSemver = re.match(r'^v([0-9]+)', nodeVersion)
if nodeSemver:
    maj = int(nodeSemver.group(1))
    if maj >= 16:
        pass
    elif maj >= 12:
        pre_gen = "blst_wrap.v12.cpp"
    elif maj >= 8:
        pre_gen = "blst_wrap.v8.cpp"
else:
    print("Error checking NodeJS version")
    sys.exit(203)

print("Done")

# try:
#     print("Copying target cpp file", )
#     shutil.copyfile("{}/{}".format(here[0], pre_gen), targetCppFile)
# except NameError:
#     sys.stderr.write("unsupported 'node --version': {}".format(version))
#     sys.exit(2)         # "no such file or directory"
