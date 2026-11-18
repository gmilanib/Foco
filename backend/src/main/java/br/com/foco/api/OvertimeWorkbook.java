package br.com.foco.api;

import org.w3c.dom.*;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.*;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.*;
import java.time.*;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.zip.*;

/** Fills the sanitized supplied template without executing user text as Excel formulas. */
final class OvertimeWorkbook {
    private static final String NS="http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    private static final Locale PT=Locale.forLanguageTag("pt-BR");
    static byte[] write(OvertimeInput input,OvertimeReport report) {
        try(var source=OvertimeWorkbook.class.getResourceAsStream("/templates/overtime.xlsx")){
            if(source==null)throw new IOException("Modelo ausente");
            var entries=new LinkedHashMap<String,byte[]>();
            try(var zip=new ZipInputStream(source)){ZipEntry e;while((e=zip.getNextEntry())!=null)entries.put(e.getName(),zip.readAllBytes());}
            Document sheet=parse(entries.get("xl/worksheets/sheet1.xml"));
            Element data=first(sheet,"sheetData"); Element prototype=(Element)cell(sheet,"A8").getParentNode().cloneNode(true);
            for(Node node=data.getLastChild();node!=null;){Node previous=node.getPreviousSibling();if(node instanceof Element e&&Integer.parseInt(e.getAttribute("r"))>=8)data.removeChild(node);node=previous;}
            text(sheet,"B2",input.provider());text(sheet,"G2",input.email());text(sheet,"B3",input.company());text(sheet,"G3",input.cnpj());
            text(sheet,"G4",input.manager());text(sheet,"G5","");
            text(sheet,"A4","Período:");
            var dateFormat=java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
            text(sheet,"B4",input.from().format(dateFormat)+" a "+input.to().format(dateFormat));
            number(sheet,"B5",date(input.from()));number(sheet,"D5",date(input.to()));
            if(input.monthlyAmount()!=null)number(sheet,"B6",input.monthlyAmount().doubleValue());
            int count=Math.max(1,report.lines().size());
            for(int i=0;i<count;i++){
                int rowNumber=8+i;Element row=(Element)prototype.cloneNode(true);row.setAttribute("r",String.valueOf(rowNumber));
                for(Node n=row.getFirstChild();n!=null;n=n.getNextSibling())if(n instanceof Element e)e.setAttribute("r",e.getAttribute("r").replaceAll("[0-9]+",String.valueOf(rowNumber)));
                data.appendChild(row);
                for(Node n=row.getFirstChild();n!=null;n=n.getNextSibling())if(n instanceof Element e)index(sheet).put(e.getAttribute("r"),e);
                if(i>=report.lines().size())continue;
                var line=report.lines().get(i);String r=String.valueOf(rowNumber);
                number(sheet,"A"+r,date(line.day()));text(sheet,"B"+r,line.day().getDayOfWeek().getDisplayName(TextStyle.FULL,PT));
                if(line.seconds()<0)number(sheet,"F"+r,line.seconds()/86400d);
                else {
                    number(sheet,"C"+r,line.startSeconds()/86400);number(sheet,"D"+r,(line.startSeconds()+line.seconds())/86400);number(sheet,"E"+r,0);
                    formula(sheet,"F"+r,"D"+r+"-C"+r+"-E"+r,line.seconds()/86400d);
                }
                text(sheet,"G"+r,line.description());text(sheet,"H"+r,line.note());
                int wrapped=Math.max(wrappedLines(line.description(),90),wrappedLines(line.note(),85));
                row.setAttribute("ht",String.valueOf(Math.min(409,Math.max(30,wrapped*15))));
            }
            int last=7+count;
            formula(sheet,"G6","SUM(F8:F"+last+")",report.totalSeconds()/86400d);
            if(input.monthlyAmount()!=null)formula(sheet,"E6","IF(B6=\"\",\"\",B6/160*G6*24)",input.monthlyAmount().doubleValue()/160*report.totalSeconds()/3600d);
            entries.put("xl/worksheets/sheet1.xml",xml(sheet));
            Document workbook=parse(entries.get("xl/workbook.xml"));
            first(workbook,"sheet").setAttribute("name",YearMonth.from(input.from()).equals(YearMonth.from(input.to()))?month(input.from())+" "+input.from().getYear():input.from()+" a "+input.to());
            // Excel's 1904 date system displays signed durations, including negative monthly balances.
            Element properties=workbook.createElementNS(NS,"x:workbookPr");properties.setAttribute("date1904","1");workbook.getDocumentElement().insertBefore(properties,workbook.getDocumentElement().getFirstChild());
            Element calc=workbook.createElementNS(NS,"x:calcPr");calc.setAttribute("fullCalcOnLoad","1");workbook.getDocumentElement().appendChild(calc);
            entries.put("xl/workbook.xml",xml(workbook));
            Document table=parse(entries.get("xl/tables/table1.xml"));table.getDocumentElement().setAttribute("ref","A7:H"+last);first(table,"autoFilter").setAttribute("ref","A7:H"+last);
            removeAll(table,"sortState");removeAll(table,"calculatedColumnFormula");entries.put("xl/tables/table1.xml",xml(table));
            var result=new ByteArrayOutputStream();try(var zip=new ZipOutputStream(result)){for(var entry:entries.entrySet()){zip.putNextEntry(new ZipEntry(entry.getKey()));zip.write(entry.getValue());zip.closeEntry();}}
            return result.toByteArray();
        }catch(Exception e){throw new IllegalStateException("Não foi possível gerar a planilha de horas extras.",e);}
    }
    private static String month(LocalDate day){String s=day.getMonth().getDisplayName(TextStyle.FULL,PT);return Character.toUpperCase(s.charAt(0))+s.substring(1);}
    private static int wrappedLines(String text,int width){return Arrays.stream(text.split("\n",-1)).mapToInt(line->Math.max(1,(line.length()+width-1)/width)).sum();}
    private static long date(LocalDate day){return ChronoUnit.DAYS.between(LocalDate.of(1904,1,1),day);}
    static Document parse(byte[] bytes)throws Exception{
        var factory=DocumentBuilderFactory.newInstance();factory.setNamespaceAware(true);factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD,"");factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA,"");
        return factory.newDocumentBuilder().parse(new ByteArrayInputStream(bytes));
    }
    private static byte[] xml(Document document)throws Exception{var factory=TransformerFactory.newInstance();factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD,"");factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_STYLESHEET,"");var out=new ByteArrayOutputStream();factory.newTransformer().transform(new DOMSource(document),new StreamResult(out));return out.toByteArray();}
    private static Element first(Document doc,String name){return (Element)doc.getElementsByTagNameNS(NS,name).item(0);}
    private static void removeAll(Document doc,String name){NodeList nodes=doc.getElementsByTagNameNS(NS,name);while(nodes.getLength()>0){Node node=nodes.item(0);node.getParentNode().removeChild(node);}}
    @SuppressWarnings("unchecked") private static Map<String,Element> index(Document doc){
        var result=(Map<String,Element>)doc.getUserData("cells");if(result!=null)return result;
        result=new HashMap<>();NodeList nodes=doc.getElementsByTagNameNS(NS,"c");for(int i=0;i<nodes.getLength();i++){Element e=(Element)nodes.item(i);result.put(e.getAttribute("r"),e);}doc.setUserData("cells",result,null);return result;
    }
    private static Element cell(Document doc,String address){Element cell=index(doc).get(address);if(cell==null)throw new IllegalArgumentException("Célula ausente: "+address);return cell;}
    private static Element clear(Document doc,String address){Element e=cell(doc,address);while(e.hasChildNodes())e.removeChild(e.getFirstChild());e.removeAttribute("t");return e;}
    private static void child(Document doc,Element parent,String tag,String value){Element e=doc.createElementNS(NS,"x:"+tag);e.setTextContent(value);parent.appendChild(e);}
    private static void text(Document doc,String address,String value){Element cell=clear(doc,address);cell.setAttribute("t","inlineStr");Element is=doc.createElementNS(NS,"x:is");String safe=value==null?"":value.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]","");child(doc,is,"t",safe);cell.appendChild(is);}
    private static void number(Document doc,String address,double value){Element e=clear(doc,address);child(doc,e,"v",Double.toString(value));}
    private static void formula(Document doc,String address,String formula,double cached){Element e=clear(doc,address);child(doc,e,"f",formula);child(doc,e,"v",Double.toString(cached));}
}
