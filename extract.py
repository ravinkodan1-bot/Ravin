import sys

def extract():
    with open('prompt.txt', 'r') as f:
        content = f.read()

    code_gs_start = content.find('const MASTER_SHEET_ID = "1VjA2TPRxVbo2NdHYHWp3O_gD3qYP-B6x6JRKR5-OjWI";')
    code_gs_end = content.find('<!DOCTYPE html>', code_gs_start)

    index_html_start = code_gs_end

    code_gs_code = content[code_gs_start:code_gs_end]
    index_html_code = content[index_html_start:]

    with open('code.gs', 'w') as f:
        f.write(code_gs_code)

    with open('index.html', 'w') as f:
        f.write(index_html_code)

if __name__ == '__main__':
    extract()
