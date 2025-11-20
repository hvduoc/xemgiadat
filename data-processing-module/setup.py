from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="xemgiadat-data-processor",
    version="1.0.0",
    author="XemGiaDat Development Team",
    author_email="dev@xemgiadat.com",
    description="Professional geospatial data processing toolkit for real estate applications",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/hvduoc/xemgiadat",
    project_urls={
        "Bug Tracker": "https://github.com/hvduoc/xemgiadat/issues",
        "Documentation": "https://docs.xemgiadat.com/data-processing",
        "Source Code": "https://github.com/hvduoc/xemgiadat/tree/main/data-processing-module",
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Scientific/Engineering :: GIS",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Operating System :: OS Independent",
    ],
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires=">=3.8",
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-cov>=4.1.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
            "mypy>=1.5.0",
        ],
        "api": [
            "fastapi>=0.104.0",
            "uvicorn>=0.24.0",
            "celery>=5.3.0",
            "redis>=5.0.0",
        ],
        "cloud": [
            "boto3>=1.29.0",
            "google-cloud-storage>=2.10.0",
            "azure-storage-blob>=12.19.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "xemgiadat-process=src.cli:main",
            "xemgiadat-api=src.api.server:main",
        ],
    },
    include_package_data=True,
    package_data={
        "": ["*.yaml", "*.json", "*.md"],
    },
    zip_safe=False,
)