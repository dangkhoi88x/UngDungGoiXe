package com.example.ungdunggoixe.service;

import java.util.Map;

public interface MailService {
    

    void  sendMail(String to, String subject, String body);
    void sendEmailWithTemplate(String to, String subject, String templateName, Map<String, Object> variables);
}
