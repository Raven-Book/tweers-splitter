use indexmap::IndexMap;
use tweers_core::core::story::Passage;

/// Single passage → Twee text
fn passage_to_twee(passage: &Passage) -> String {
    let mut header = format!(":: {}", passage.name);

    if let Some(ref tags) = passage.tags {
        if !tags.is_empty() {
            header.push_str(&format!(" [{}]", tags));
        }
    }

    let has_pos = passage.position.is_some();
    let has_size = passage.size.is_some();
    if has_pos || has_size {
        let pos = passage.position.as_deref().unwrap_or("0,0");
        let size = passage.size.as_deref().unwrap_or("100,100");
        header.push_str(&format!(
            " {{\"position\":\"{}\",\"size\":\"{}\"}}",
            pos, size
        ));
    }

    format!("{}\n{}", header, passage.content)
}

/// A group of passages → complete .twee file content
pub fn group_to_twee(names: &[String], passages: &IndexMap<String, Passage>) -> String {
    let parts: Vec<String> = names
        .iter()
        .filter_map(|name| passages.get(name))
        .map(passage_to_twee)
        .collect();

    parts.join("\n\n")
}
