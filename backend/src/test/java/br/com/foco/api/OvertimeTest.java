package br.com.foco.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.zip.*;
import java.io.*;
import static org.junit.jupiter.api.Assertions.*;

class OvertimeTest {
    @TempDir Path root;
    final LocalDate day=LocalDate.of(2026,9,21);
    OvertimeInput input(String normal,String extra,int tolerance){return new OvertimeInput(day,day,normal,extra,"Prestador teste","","","","",null,tolerance);}
    Function<LocalDate,ScheduleDay> schedule(double hours){return d->new ScheduleDay(hours==0?List.of():List.of(new ClockWindow("09:00","17:00")),hours*3600,"Teste");}
    SessionRow session(String id,String start,double real,double rounded){
        OffsetDateTime at=OffsetDateTime.parse(start),end=at.plusSeconds((long)real);
        return new SessionRow(id,null,"Cliente","Projeto","Atividade","",null,null,at,end,end.plusSeconds((long)(rounded-real)),0,rounded,null,"Encerrada","Normal");
    }
    OvertimeReport calc(OvertimeInput in,List<SessionRow> sessions){return OvertimeCalculator.calculate(in,sessions,List.of(),schedule(8));}
    @Test void thresholdAndCrossingUseSeparateBases(){
        var first=session("a","2026-09-21T09:00:00-03:00",26940,27000);
        var second=session("b","2026-09-21T17:00:00-03:00",2700,2760);
        assertEquals(900,calc(input("rounded","real",30),List.of(first,second)).totalSeconds());
        assertEquals(960,calc(input("rounded","rounded",30),List.of(first,second)).totalSeconds());
        assertEquals(840,calc(input("real","real",30),List.of(first,second)).totalSeconds());
        assertEquals(900,calc(input("real","rounded",30),List.of(first,second)).totalSeconds());
        assertEquals(0,calc(input("rounded","real",30),List.of(session("c","2026-09-21T09:00:00-03:00",28740,28800))).totalSeconds());
    }
    @Test void onlyMissingTimeBeyondToleranceIsDeducted(){
        assertEquals(-1800,calc(input("rounded","real",30),List.of(session("a","2026-09-21T09:00:00-03:00",25200,25200))).totalSeconds());
        assertEquals(0,calc(input("rounded","real",30),List.of(session("a","2026-09-21T09:00:00-03:00",27000,27000))).totalSeconds());
        assertEquals(-27000,calc(input("rounded","real",30),List.of()).totalSeconds());
        assertEquals(-28800,calc(input("rounded","real",0),List.of()).totalSeconds());
        assertEquals(0,OvertimeCalculator.calculate(input("rounded","real",30),List.of(),List.of(),schedule(0)).totalSeconds());
    }
    @Test void noDeductionTodayOrInFuture(){
        var today=LocalDate.now(WorkSchedule.ZONE);var in=new OvertimeInput(today,today,"rounded","real","","","","","",null,30);
        assertEquals(0,calc(in,List.of()).totalSeconds());
    }
    @Test void breaksAreNotWorkedAndExtraStartsAfterLastResume(){
        var s=session("a","2026-09-21T09:00:00-03:00",32400,32400);
        var intervals=List.of(new WorkInterval("a",s.startAt(),s.startAt().plusHours(3),s.startAt().plusHours(3),"Precisa"),new WorkInterval("a",s.startAt().plusHours(4),s.startAt().plusHours(10),s.startAt().plusHours(10),"Precisa"));
        var result=OvertimeCalculator.calculate(input("rounded","real",30),List.of(s),intervals,schedule(8));
        assertEquals(3600,result.totalSeconds());assertEquals(18*3600,result.lines().get(0).startSeconds());
    }
    @Test void splitsAtSaoPauloMidnightAndHonorsDaySpecificTarget(){
        var s=session("a","2026-09-22T02:00:00Z",10800,10800);
        var in=new OvertimeInput(day,day.plusDays(1),"rounded","real","","","","","",null,30);
        var report=OvertimeCalculator.calculate(in,List.of(s),List.of(),d->schedule(d.equals(day)?0:1).apply(d));
        assertEquals(7200,report.totalSeconds());assertEquals(List.of(day,day.plusDays(1)),report.lines().stream().map(OvertimeLine::day).toList());
    }
    @Test void periodExcludesOutsideDatesAndRejectsInvertedDates(){
        assertThrows(IllegalArgumentException.class,()->new OvertimeInput(day,day.minusDays(1),"rounded","real","","","","","",null,30).validate());
        var result=OvertimeCalculator.calculate(input("rounded","real",30),List.of(session("a","2026-09-20T20:00:00-03:00",18000,18000)),List.of(),schedule(0));
        assertEquals(3600,result.totalSeconds());
    }
    @Test void crossMonthCutIncludesBothBoundariesAndDailyDeductions()throws Exception{
        LocalDate from=LocalDate.of(2026,9,20),to=LocalDate.of(2026,10,21);
        var in=new OvertimeInput(from,to,"rounded","real","","","","","",null,30);
        var rows=List.of(session("first",from+"T09:00:00-03:00",32400,32400),session("last",to+"T09:00:00-03:00",32400,32400),session("outside",to.plusDays(1)+"T09:00:00-03:00",36000,36000));
        var report=OvertimeCalculator.calculate(in,rows,List.of(),d->schedule(d.equals(from)||d.equals(to)?8:d.equals(from.plusDays(1))?1:0).apply(d));
        assertEquals(7200,report.extraSeconds());assertEquals(1800,report.deductionSeconds());assertEquals(5400,report.totalSeconds());
        assertEquals(List.of(from,from.plusDays(1),to),report.lines().stream().map(OvertimeLine::day).toList());
        var zip=unzip(OvertimeWorkbook.write(in,report));assertTrue(new String(zip.get("xl/worksheets/sheet1.xml"),java.nio.charset.StandardCharsets.UTF_8).contains("20/09/2026 a 21/10/2026"));assertTrue(new String(zip.get("xl/workbook.xml")).contains("2026-09-20 a 2026-10-21"));
    }
    @Test void crossYearCutIsAccepted(){
        var in=new OvertimeInput(LocalDate.of(2026,12,20),LocalDate.of(2027,1,21),"rounded","real","","","","","",null,30);
        assertDoesNotThrow(in::validate);
        assertEquals(7200,OvertimeCalculator.calculate(in,List.of(session("dec","2026-12-31T09:00:00-03:00",3600,3600),session("jan","2027-01-01T09:00:00-03:00",3600,3600)),List.of(),schedule(0)).totalSeconds());
    }
    @Test void overlapIsVisibleAndActiveSessionsAreExcluded(){
        var s=session("a","2026-09-21T09:00:00-03:00",3600,3600);
        var active=new SessionRow("active",null,"","","",null,null,null,s.startAt(),null,null,0,36000,null,"Pausada","Normal");
        var report=OvertimeCalculator.calculate(input("rounded","real",30),List.of(s,session("b","2026-09-21T09:30:00-03:00",3600,3600),active),List.of(),schedule(0));
        assertEquals(7200,report.totalSeconds());assertTrue(report.warnings().stream().anyMatch(w->w.contains("sobrepostos")));assertTrue(report.warnings().stream().anyMatch(w->w.contains("pausados")));
    }
    Map<String,byte[]> unzip(byte[] bytes)throws Exception{var entries=new HashMap<String,byte[]>();try(var zip=new ZipInputStream(new ByteArrayInputStream(bytes))){ZipEntry e;while((e=zip.getNextEntry())!=null)entries.put(e.getName(),zip.readAllBytes());}return entries;}
    @Test void workbookHasSignedCachedFormulasActualDatesAndSafeText()throws Exception{
        var lines=List.of(new OvertimeLine(day,18*3600,3600,"=HYPERLINK(\"https://invalid\")","Teste"),new OvertimeLine(day.plusDays(1),7200,-7200,"Abatimento","Teste"));
        byte[] bytes=OvertimeWorkbook.write(input("rounded","real",30),new OvertimeReport(lines,3600,7200,-3600,List.of()));
        var entries=unzip(bytes);String sheet=new String(entries.get("xl/worksheets/sheet1.xml"),java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(sheet.contains("D8-C8-E8"));assertTrue(sheet.contains("SUM(F8:F9)"));assertTrue(sheet.contains("-0.041666666666666664"));assertTrue(sheet.contains("inlineStr"));assertFalse(sheet.contains("<x:f>HYPERLINK"));
        String book=new String(entries.get("xl/workbook.xml"),java.nio.charset.StandardCharsets.UTF_8);assertTrue(book.contains("date1904=\"1\""));assertTrue(book.contains("Setembro 2026"));
        assertFalse(new String(entries.get("xl/tables/table1.xml"),java.nio.charset.StandardCharsets.UTF_8).contains("calculatedColumnFormula"));
        for(byte[] entry:entries.values())assertFalse(new String(entry,java.nio.charset.StandardCharsets.UTF_8).toLowerCase().contains("gabriel"));
        Files.write(root.resolve("export.xlsx"),bytes);
    }
    @Test void totalsAbove24HoursAndMoreRowsThanOriginalTemplate()throws Exception{
        var lines=new ArrayList<OvertimeLine>();for(int i=0;i<1000;i++)lines.add(new OvertimeLine(day,0,3600,"Atividade",""));
        var zip=unzip(OvertimeWorkbook.write(input("rounded","real",30),new OvertimeReport(lines,3600000,0,3600000,List.of())));
        String sheet=new String(zip.get("xl/worksheets/sheet1.xml"));assertTrue(sheet.contains("SUM(F8:F1007)"));assertTrue(sheet.contains("r=\"H1007\""));
    }
}
