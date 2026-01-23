#!/usr/bin/env python3
# Check BOM in netlify.toml

p = "netlify.toml"
b = open(p, "rb").read(4)
print("first4bytes:", b)
print("has_BOM:", b.startswith(b"\xef\xbb\xbf"))

# Show first 50 bytes
raw = open(p, "rb").read(50)
print("\nFirst 50 bytes:")
print(raw)
print("\nFirst line should start with '[build]'")
