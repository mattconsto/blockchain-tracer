import re
import sys
from urllib.request import urlopen
from urllib.parse import unquote

# Helper function to print to stderr
def eprint(*args, **kwargs):
	print(*args, file=sys.stderr, **kwargs)

# Compile once for speed, this regex is a nasty hack but whatever, it works
p = re.compile(r'<tr>[^\0]*?<td><a href=\"\/address\/([^\0]*?)\"[^\0]*?<\/td>[^\0]*?<td><span[^\0]*?>([^\0]*?)<\/span><\/td>[^\0]*?<td><a href=\"https://blockchain\.info/r\?url=([^\0]*?)\"[^\0]*?<\/a><\/td>[^\0]*?<td>[^\0]*?<img[^\0]*?src=\"\/Resources\/([^\0]*?).png\">[^\0]*?<\/td>[^\0]*?<\/tr>')

print("{")

for offset in range(0, 3550, 50): # 3550 is currently (2018-5-11) the last offset
	url = 'https://blockchain.info/tags?offset=' + str(offset)
	eprint(url)

	with urlopen(url) as response:
		for (id, name, link, verifed) in re.findall(p, str(response.read())):
			print('"%s":{"n":"%s","l":"%s","v":%s},' % (
				id, name.replace('"','\\"'), unquote(link).replace('"','\\"'), '1' if verifed == "green_tick" else '0'
			))

print("}")
