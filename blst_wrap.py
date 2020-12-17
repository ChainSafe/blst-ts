import sys
import subprocess
import re
import shutil
import os
import os.path

pythonScript = sys.argv[0]
# ../blst.swg
sourceSwgFile = sys.argv[1]
# <(INTERMEDIATE_DIR)/blst_wrap.cpp
# In Github actions: /home/runner/work/blst-ts/blst-ts/blst/bindings/node.js/build/Release/obj.target/blst/geni/blst_wrap.cpp
targetCppFile = sys.argv[2]
print("sourceSwgFile", sourceSwgFile)
print("targetCppFile", targetCppFile)


if os.path.isfile(targetCppFile):
    print("targetCppFile already exists, skipping build")
    sys.exit(0)
else:
    if os.environ['SWIG_SKIP_RUN']:
        print("targetCppFile not found, and SWIG_SKIP_RUN=true")
        sys.exit(201)
    else:
        print("targetCppFile not found, building")

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

# Copy resulting blst_wrap.cpp file from INTERMEDIATE_DIR
# to this script's dir so it can be picked up by actions/upload-artifact
print("Copying target cpp file")
shutil.copyfile(targetCppFile, "./blst_wrap.cpp")

print("Done")
