import struct
import zlib
import os

def create_png(width, height, filename):
    def make_chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc
    
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    raw = b''
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            raw += b'\x55\x3a\xca\xff'
    compressed = zlib.compress(raw)
    
    with open(filename, 'wb') as f:
        f.write(sig)
        f.write(make_chunk(b'IHDR', ihdr))
        f.write(make_chunk(b'IDAT', compressed))
        f.write(make_chunk(b'IEND', b''))

os.chdir(os.path.dirname(os.path.abspath(__file__)))
create_png(32, 32, '32x32.png')
create_png(128, 128, '128x128.png')
create_png(256, 256, '128x128@2x.png')
create_png(512, 512, 'icon.png')
print('PNG icons created')
