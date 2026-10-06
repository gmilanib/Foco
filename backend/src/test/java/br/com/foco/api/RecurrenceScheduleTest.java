package br.com.foco.api;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
class RecurrenceScheduleTest {
 TemplateRow row(String recurrence,String date,List<Integer> days,Integer monthDay){return new TemplateRow("id","a","Modelo",recurrence,LocalDate.parse(date),false,days,monthDay,false);}
 @Test void monthlyClampsFebruaryAndReturnsTo31IncludingLeapYears(){
  assertEquals(LocalDate.parse("2027-02-28"),RecurrenceSchedule.next(row("monthly","2027-01-31",List.of(),31),LocalDate.parse("2027-01-31")));
  assertEquals(LocalDate.parse("2027-03-31"),RecurrenceSchedule.next(row("monthly","2027-02-28",List.of(),31),LocalDate.parse("2027-02-28")));
  assertEquals(LocalDate.parse("2028-02-29"),RecurrenceSchedule.next(row("monthly","2028-01-31",List.of(),31),LocalDate.parse("2028-01-31")));
 }
 @Test void weekdayScheduleAndWeeklyCadenceCrossYearWithoutBacklog(){
  assertEquals(LocalDate.parse("2027-01-04"),RecurrenceSchedule.next(row("workdays","2026-12-25",List.of(1,2,3,4,5),null),LocalDate.parse("2027-01-01")));
  assertEquals(LocalDate.parse("2026-10-07"),RecurrenceSchedule.next(row("weekdays","2026-09-02",List.of(3),null),LocalDate.parse("2026-10-02")));
  assertEquals(LocalDate.parse("2026-10-05"),RecurrenceSchedule.next(row("weekly","2026-09-07",List.of(),null),LocalDate.parse("2026-10-02")));
 }
}
