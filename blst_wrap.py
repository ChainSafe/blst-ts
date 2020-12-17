import sys
import subprocess
import re
import shutil
import os
import os.path


pythonScript = sys.argv[0]
# ../blst.swg
SOURCE_SWIG_FILE = sys.argv[1]
# <(INTERMEDIATE_DIR)/blst_wrap.cpp
# In Github actions: /home/runner/work/blst-ts/blst-ts/blst/bindings/node.js/build/Release/obj.target/blst/geni/blst_wrap.cpp
BLST_WRAP_CPP_TARGET = sys.argv[2]
BLST_WRAP_CPP_PREBUILD = os.getenv('BLST_WRAP_CPP_PREBUILD')
SWIG_SKIP_RUN = os.getenv('SWIG_SKIP_RUN')

print("SOURCE_SWIG_FILE", SOURCE_SWIG_FILE)
print("BLST_WRAP_CPP_TARGET", BLST_WRAP_CPP_TARGET)
print("BLST_WRAP_CPP_PREBUILD", BLST_WRAP_CPP_PREBUILD)
print("SWIG_SKIP_RUN", SWIG_SKIP_RUN)
print("CWD", os.getcwd())


if BLST_WRAP_CPP_PREBUILD and os.path.isfile(BLST_WRAP_CPP_PREBUILD):
    print("Copying and using BLST_WRAP_CPP_PREBUILD")
    shutil.copyfile(BLST_WRAP_CPP_PREBUILD, BLST_WRAP_CPP_TARGET)
    sys.exit(0)
else:
    if SWIG_SKIP_RUN:
        print("BLST_WRAP_CPP_PREBUILD not found, but it should exist since SWIG_SKIP_RUN=true")
        sys.exit(201)
    else:
        print("BLST_WRAP_CPP_TARGET not found, building")

try:
    version = subprocess.check_output(["swig", "-version"]).decode('ascii')
    print(version)
    v = re.search(r'SWIG Version ([0-9]+)', version)
    if v and int(v.group(1)) >= 4:
        print("Running SWIG...")
        subprocess.check_call(["swig", "-c++", "-javascript",
                                       "-node", "-DV8_VERSION=0x060000",
                                       "-o", BLST_WRAP_CPP_TARGET, SOURCE_SWIG_FILE])
    else:
        print("Unsupported swig version")
        sys.exit(202)
    
except OSError as e:
    if e.errno == 2:    # "no such file or directory"
        print("SWIG not installed", e)
    else:
        print("Error checking SWIG version", e)
    sys.exit(e.errno)


if BLST_WRAP_CPP_PREBUILD:
    print("Copying built BLST_WRAP_CPP_TARGET to BLST_WRAP_CPP_PREBUILD")
    shutil.copyfile(BLST_WRAP_CPP_TARGET, BLST_WRAP_CPP_PREBUILD)


print("Done")
