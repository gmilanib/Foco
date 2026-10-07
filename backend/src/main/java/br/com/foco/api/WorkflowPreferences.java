package br.com.foco.api;

import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.Map;

final class WorkflowPreferences {
    private WorkflowPreferences() {}
    static void validate(Map<String,String> values){
        for(String key:new String[]{"capture.enabled","reminders.planning.enabled","reminders.review.enabled"}){
            if(values.containsKey(key)&&!"true".equals(values.get(key))&&!"false".equals(values.get(key)))
                throw new IllegalArgumentException("Informe se o atalho ou lembrete está ativado.");
        }
        if(values.containsKey("capture.shortcut")){
            String value=values.get("capture.shortcut");
            if(value==null||!value.matches("(?i)(?:(?:Control|Ctrl|Alt|Shift|Super)\\+){1,4}(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4]))")||!value.matches("(?i).*(?:Control|Ctrl|Alt|Super)\\+.*"))
                throw new IllegalArgumentException("Use Ctrl, Alt ou Super com uma letra, número ou F1 a F24. Exemplo: Ctrl+Alt+Q.");
        }
        for(String key:new String[]{"reminders.planning.time","reminders.review.time"}){
            if(values.containsKey(key)){
                String value=values.get(key);
                try{if(value==null||!value.matches("[0-9]{2}:[0-9]{2}"))throw new DateTimeParseException("time","",0);LocalTime.parse(value);}
                catch(DateTimeParseException error){throw new IllegalArgumentException("Informe o horário do lembrete no formato HH:mm.");}
            }
        }
    }
}
