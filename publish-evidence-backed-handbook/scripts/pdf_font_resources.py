"""Remove unused unembedded fonts and their unused font-selection operators."""
from pypdf.generic import ContentStream,NameObject,DecodedStreamObject

def prune_unpainted_unembedded_fonts(reader):
    painted=set();records=[];seen=set()
    def key(font):
        ref=getattr(font,'indirect_reference',None)
        return (ref.idnum,ref.generation) if ref else id(font)
    def walk(container,stream,resources,is_page):
        resources=resources.get_object();fonts=resources.get('/Font',{}).get_object() if hasattr(resources.get('/Font',{}),'get_object') else resources.get('/Font',{})
        content=ContentStream(stream,reader);records.append((container,content,fonts,is_page));active=None;stack=[]
        for args,op in content.operations:
            if op==b'q':stack.append(active)
            elif op==b'Q':active=stack.pop() if stack else active
            elif op==b'Tf':active=args[0]
            elif op in (b'Tj',b'TJ',b"'",b'"') and active in fonts:painted.add(key(fonts[active].get_object()))
            elif op==b'Do':
                objects=resources.get('/XObject',{});objects=objects.get_object() if hasattr(objects,'get_object') else objects
                ref=objects.get(args[0]);obj=ref.get_object() if ref else None
                if obj and obj.get('/Subtype')=='/Form' and key(obj) not in seen:
                    seen.add(key(obj));walk(obj,obj,obj.get('/Resources',resources),False)
    for page in reader.pages:walk(page,page.get_contents(),page['/Resources'],True)
    removals=set();names=[]
    for _,_,fonts,_ in records:
        for ref in fonts.values():
            font=ref.get_object()
            if key(font) not in painted and not font.get('/FontDescriptor') and not font.get('/DescendantFonts'):removals.add(key(font));names.append(str(font.get('/BaseFont','')))
    for container,content,fonts,is_page in records:
        unused={name for name,ref in fonts.items() if key(ref.get_object()) in removals}
        if unused:
            content.operations=[(args,op) for args,op in content.operations if not(op==b'Tf' and args[0] in unused)]
            if is_page:
                frozen=DecodedStreamObject();frozen.set_data(content.get_data());container[NameObject('/Contents')]=reader._add_object(frozen)
            else:container.set_data(content.get_data())
    for _,_,fonts,_ in records:
        for name in list(fonts):
            if key(fonts[name].get_object()) in removals:del fonts[name]
    return sorted(set(names))
