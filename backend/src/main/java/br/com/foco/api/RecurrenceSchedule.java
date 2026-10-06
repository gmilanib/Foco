package br.com.foco.api;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

final class RecurrenceSchedule {
    private RecurrenceSchedule() {}
    static List<Integer> weekdays(String recurrence,List<Integer> input){
        if(recurrence.equals("workdays"))return List.of(1,2,3,4,5);
        if(!recurrence.equals("weekdays"))return List.of();
        if(input==null||input.isEmpty()||input.stream().anyMatch(i->i==null||i<1||i>7))
            throw new IllegalArgumentException("Escolha pelo menos um dia da semana.");
        return input.stream().distinct().sorted().toList();
    }
    static void validate(String recurrence,LocalDate date,List<Integer> days,Integer monthDay){
        if(!Set.of("none","daily","weekly","workdays","weekdays","monthly").contains(recurrence))throw new IllegalArgumentException("Frequência inválida.");
        if(recurrence.equals("none"))return;
        if(date==null)throw new IllegalArgumentException("Informe a próxima ocorrência.");
        if(Set.of("workdays","weekdays").contains(recurrence)&&!days.contains(date.getDayOfWeek().getValue()))
            throw new IllegalArgumentException("A próxima data deve corresponder aos dias escolhidos.");
        if(recurrence.equals("monthly")){
            if(monthDay==null||monthDay<1||monthDay>31)throw new IllegalArgumentException("Escolha um dia mensal entre 1 e 31.");
            if(date.getDayOfMonth()!=Math.min(monthDay,date.lengthOfMonth()))throw new IllegalArgumentException("A próxima data deve corresponder ao dia mensal.");
        }
    }
    static LocalDate next(TemplateRow template,LocalDate today){
        LocalDate anchor=template.nextDate();
        return switch(template.recurrence()){
            case "daily" -> today.plusDays(1);
            case "weekly" -> anchor.plusWeeks(ChronoUnit.DAYS.between(anchor,today)/7+1);
            case "workdays","weekdays" -> {
                LocalDate next=today.plusDays(1);
                while(!template.weekdays().contains(next.getDayOfWeek().getValue()))next=next.plusDays(1);
                yield next;
            }
            case "monthly" -> {
                YearMonth month=YearMonth.from(today);
                LocalDate next=month.atDay(Math.min(template.monthDay(),month.lengthOfMonth()));
                if(!next.isAfter(today)){month=month.plusMonths(1);next=month.atDay(Math.min(template.monthDay(),month.lengthOfMonth()));}
                yield next;
            }
            default -> throw new IllegalArgumentException("Modelo sem recorrência.");
        };
    }
}
